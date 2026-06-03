import { describe, expect, it, vi } from "vitest";
import type { BrainGraphSnapshot } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { readRepoSource } from "@/invariants/readRepoSource";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import {
  createNewsSourceRegistry,
  type NewsSource,
} from "@/providers/news/types";
import { assertAgentToolsReadOnly, createAgentTools } from "@/agent/tools";
import { AgentRunAbortedError, runAgentJob } from "@/agent/runner";
import {
  applyGraphMutation,
  primaryNodeIdFromProposal,
} from "@/lib/graphMutations";
import {
  buildResearchProposalsFromCandidates,
  createTopicResearchJob,
  DEFAULT_RESEARCH_CONFIG,
  filterNewsByTopic,
  isResearchTempId,
  mapTempIdAfterCreate,
  resolveResearchTempIdsInProposal,
  sortResearchProposalsForApprove,
  TOPIC_RESEARCH_STEP_TOKENS,
  toResearchTempId,
} from "./topicResearchJob";

function createMockNewsSource(items: NewsItem[]): NewsSource {
  return {
    id: "mock-research-news",
    label: "Mock Research",
    async fetchLatest() {
      return {
        sourceId: "mock-research-news",
        fetchedAt: new Date().toISOString(),
        items,
      };
    },
  };
}

function makeNewsItem(index: number, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: `news-${index}`,
    title: `RAG 检索增强 ${index}`,
    summary: `关于 RAG 与 Agent 编排的进展 ${index}`,
    sourceName: "Mock RSS",
    sourceUrl: `https://example.com/rag-${index}`,
    category: "ai_news",
    publishedAt: `2026-06-0${Math.min(index + 1, 9)}T00:00:00.000Z`,
    ...overrides,
  };
}

function createResearchTools(
  items: NewsItem[],
  readGraph: () => Promise<BrainGraphSnapshot> = async () => ({
    nodes: [],
    edges: [],
  }),
) {
  const loadGraph = vi.fn(readGraph);
  const loadUserProfile = vi.fn().mockResolvedValue(DEFAULT_USER_PROFILE);

  const tools = createAgentTools({
    llm: createMockLlmProvider(),
    news: createNewsSourceRegistry([createMockNewsSource(items)]),
    readGraph: loadGraph,
    readProfile: loadUserProfile,
  });

  return { tools, loadGraph, loadUserProfile };
}

describe("filterNewsByTopic", () => {
  it("keeps items matching topic keywords", () => {
    const items = [
      makeNewsItem(0, { title: "RAG 新进展" }),
      makeNewsItem(1, {
        title: "无关天气",
        summary: "今日多云转晴",
      }),
    ];
    const filtered = filterNewsByTopic(items, "RAG", ["RAG 与 Agent 关系"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("news-0");
  });
});

describe("research proposal helpers", () => {
  it("sorts create before link for approve order", () => {
    const sorted = sortResearchProposalsForApprove([
      {
        id: "l1",
        kind: "link",
        summary: "link",
        payload: { sourceId: "a", targetId: "b", relationType: "related" },
      },
      {
        id: "c1",
        kind: "create",
        summary: "create",
        payload: { title: "A", intro: "i", sourceUrl: null },
      },
    ]);
    expect(sorted[0]?.kind).toBe("create");
    expect(sorted[1]?.kind).toBe("link");
  });

  it("builds linked proposals with stable temp ids between batch creates", () => {
    const proposals = buildResearchProposalsFromCandidates(
      [
        {
          title: "研究概念 A",
          intro: "a",
          sourceUrl: null,
          relations: [{ targetTitle: "研究概念 B", relationType: "related" }],
        },
        {
          title: "研究概念 B",
          intro: "b",
          sourceUrl: null,
          relations: [],
        },
      ],
      { nodes: [], edges: [] },
    );

    expect(proposals.filter((p) => p.kind === "create")).toHaveLength(2);
    expect(proposals.filter((p) => p.kind === "link").length).toBeGreaterThanOrEqual(
      1,
    );

    const link = proposals.find((p) => p.kind === "link");
    expect(link).toBeDefined();
    const payload = link!.payload as {
      sourceId: string;
      targetId: string;
    };
    expect(isResearchTempId(payload.sourceId)).toBe(true);
    expect(isResearchTempId(payload.targetId)).toBe(true);
    expect(payload.sourceId).toBe(toResearchTempId("研究概念 A"));
    expect(payload.targetId).toBe(toResearchTempId("研究概念 B"));
  });
});

describe("TopicResearchJob", () => {
  it("produces linked pending research_loop proposals under mock", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1)];
    const { tools, loadGraph, loadUserProfile } = createResearchTools(items);

    const result = await runAgentJob(
      createTopicResearchJob("RAG"),
      tools,
      new AbortController().signal,
    );

    expect(result.proposals.length).toBeGreaterThanOrEqual(2);
    expect(result.proposals.every((p) => p.status === "pending")).toBe(true);
    expect(result.proposals.every((p) => p.source === "research_loop")).toBe(
      true,
    );
    expect(result.proposals.some((p) => p.proposal.kind === "link")).toBe(true);

    const sorted = sortResearchProposalsForApprove(
      result.proposals.map((p) => p.proposal),
    );
    const firstLinkIndex = sorted.findIndex((p) => p.kind === "link");
    const lastCreateIndex = sorted.map((p) => p.kind).lastIndexOf("create");
    expect(firstLinkIndex).toBeGreaterThan(lastCreateIndex);

    expect(result.digest?.title).toContain("RAG");
    expect(result.trace.some((step) => step.name === "plan")).toBe(true);
    expect(result.trace.some((step) => step.name === "gather")).toBe(true);
    expect(result.trace.some((step) => step.name === "synthesize")).toBe(true);
    expect(result.trace.some((step) => step.name === "propose")).toBe(true);

    expect(loadGraph).toHaveBeenCalled();
    expect(loadUserProfile).toHaveBeenCalled();
    assertAgentToolsReadOnly(tools);
  });

  it("truncates when token budget is exceeded", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1)];
    const { tools } = createResearchTools(items);

    const budget =
      TOPIC_RESEARCH_STEP_TOKENS.plan + TOPIC_RESEARCH_STEP_TOKENS.gather;

    const result = await runAgentJob(
      createTopicResearchJob("RAG", { tokenBudgetPerRun: budget }),
      tools,
      new AbortController().signal,
    );

    expect(result.trace.some((step) => step.name === "budget_truncated")).toBe(
      true,
    );
    expect(result.proposals).toHaveLength(0);
  });

  it("truncates when maxSteps is exceeded", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1)];
    const { tools } = createResearchTools(items);

    const result = await runAgentJob(
      createTopicResearchJob("RAG", {
        maxSteps: 2,
        tokenBudgetPerRun: DEFAULT_RESEARCH_CONFIG.tokenBudgetPerRun,
      }),
      tools,
      new AbortController().signal,
    );

    expect(
      result.trace.some((step) => step.name === "step_limit_truncated"),
    ).toBe(true);
    expect(result.proposals).toHaveLength(0);
  });

  it("returns empty proposals when synthesize yields no candidates", async () => {
    const llm = createMockLlmProvider();
    vi.spyOn(llm, "synthesizeConcepts").mockResolvedValue([]);
    const readGraph = vi.fn().mockResolvedValue({ nodes: [], edges: [] });
    const readProfile = vi.fn().mockResolvedValue(DEFAULT_USER_PROFILE);

    const emptyTools = createAgentTools({
      llm,
      news: createNewsSourceRegistry([createMockNewsSource([])]),
      readGraph,
      readProfile,
    });

    const result = await runAgentJob(
      createTopicResearchJob("RAG"),
      emptyTools,
      new AbortController().signal,
    );

    expect(result.proposals).toHaveLength(0);
    expect(result.trace.some((step) => step.name === "synthesize")).toBe(true);
  });

  it("throws AgentRunAbortedError when signal aborts mid-run", async () => {
    const items = [makeNewsItem(0)];
    const controller = new AbortController();
    const { tools } = createResearchTools(items);

    const originalPlan = tools.planResearch.bind(tools);
    tools.planResearch = async (topic, profile) => {
      controller.abort();
      return originalPlan(topic, profile);
    };

    await expect(
      runAgentJob(createTopicResearchJob("RAG"), tools, controller.signal),
    ).rejects.toBeInstanceOf(AgentRunAbortedError);
  });

  it("batch approve after sorting yields a connected subgraph", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1)];
    const { tools } = createResearchTools(items);

    const result = await runAgentJob(
      createTopicResearchJob("RAG"),
      tools,
      new AbortController().signal,
    );

    let snapshot: BrainGraphSnapshot = { nodes: [], edges: [] };
    const tempToReal = new Map<string, string>();
    const ordered = sortResearchProposalsForApprove(
      result.proposals.map((p) => p.proposal),
    );

    for (const proposal of ordered) {
      const resolved = resolveResearchTempIdsInProposal(proposal, tempToReal);
      const before = snapshot;
      const after = applyGraphMutation(before, resolved);
      mapTempIdAfterCreate(resolved, before, after, tempToReal);
      snapshot = after;
    }

    expect(snapshot.nodes.filter((n) => !n.archived).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(snapshot.edges.length).toBeGreaterThanOrEqual(1);

    const createProposal = ordered.find((p) => p.kind === "create");
    expect(createProposal).toBeDefined();
    const nodeId = primaryNodeIdFromProposal(createProposal!, snapshot);
    expect(nodeId).toBeTruthy();
  });

  it("does not import storage write or graph mutation paths", () => {
    const jobSource = readRepoSource("src/agent/jobs/topicResearchJob.ts");
    expect(jobSource).not.toContain("StorageProvider");
    expect(jobSource).not.toContain("persistGraphSnapshot");
    expect(jobSource).not.toContain("applyGraphMutation");
    expect(jobSource).not.toContain("saveProposal");
  });
});
