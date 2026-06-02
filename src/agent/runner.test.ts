import { describe, expect, it, vi } from "vitest";
import type { NewsItem } from "@/domain/news";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import {
  createNewsSourceRegistry,
  type NewsSource,
} from "@/providers/news/types";
import {
  assertAgentToolsReadOnly,
  createAgentTools,
} from "./tools";
import {
  assertNotAborted,
  beginTraceStep,
  finishTraceStep,
  runAgentJob,
} from "./runner";
import type {
  AgentJob,
  AgentRunResult,
  ProposalEnvelope,
} from "./types";
import { readRepoSource } from "@/invariants/readRepoSource";

const sampleNews: NewsItem = {
  id: "news-probe-1",
  title: "Transformer 上下文窗口再扩展",
  summary: "更长 context 支持整本书级别输入。",
  sourceUrl: "https://example.com/context",
  sourceName: "Mock RSS",
  category: "ai_news",
  publishedAt: "2026-06-01T00:00:00.000Z",
};

function createMockNewsSource(items: NewsItem[] = [sampleNews]): NewsSource {
  return {
    id: "mock-probe-news",
    label: "Mock Probe",
    async fetchLatest() {
      return {
        sourceId: "mock-probe-news",
        fetchedAt: new Date().toISOString(),
        items,
      };
    },
  };
}

/** Minimal ingest-shaped job for A1 — full MorningBriefJob lands in A3. */
const probeIngestJob: AgentJob = {
  id: "probe-ingest",
  async run(tools, signal) {
    assertNotAborted(signal);

    const runId = `run-probe-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const trace = [];

    const fetchDraft = beginTraceStep("fetchNews");
    const news = await tools.fetchNews();
    trace.push(finishTraceStep(fetchDraft, `${news.length} items`));
    assertNotAborted(signal);

    const graphDraft = beginTraceStep("readGraph");
    const graph = await tools.readGraph();
    trace.push(finishTraceStep(graphDraft, `${graph.nodes.length} nodes`));

    await tools.readProfile();

    const item = news[0];
    if (!item) {
      return {
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        proposals: [],
        digest: null,
        trace,
      };
    }

    const summaryDraft = beginTraceStep("summarize", item.title);
    const summary = await tools.summarize(item);
    trace.push(finishTraceStep(summaryDraft, summary.slice(0, 80), 100));
    assertNotAborted(signal);

    const proposeDraft = beginTraceStep("propose", item.title);
    const context = JSON.stringify({
      newsItem: item,
      nodes: graph.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        intro: node.intro,
      })),
    });
    const mutations = await tools.propose(context);
    trace.push(
      finishTraceStep(proposeDraft, `${mutations.length} proposals`, 200),
    );

    const createdAt = new Date().toISOString();
    const proposals: ProposalEnvelope[] = mutations.map((proposal) => ({
      id: proposal.id,
      runId,
      createdAt,
      source: "background_ingest",
      status: "pending",
      proposal,
    }));

    return {
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      proposals,
      digest: {
        title: "Probe digest",
        sections: [{ headline: item.title, body: summary }],
        generatedAt: createdAt,
      },
      trace,
    };
  },
};

describe("AgentTools", () => {
  it("delegates to providers and exposes only read + LLM/news methods", async () => {
    const loadGraph = vi.fn().mockResolvedValue({ nodes: [], edges: [] });
    const loadUserProfile = vi.fn().mockResolvedValue(DEFAULT_USER_PROFILE);
    const llm = createMockLlmProvider();
    const summarizeSpy = vi.spyOn(llm, "summarizeNews");

    const tools = createAgentTools({
      llm,
      news: createNewsSourceRegistry([createMockNewsSource()]),
      readGraph: loadGraph,
      readProfile: loadUserProfile,
    });

    assertAgentToolsReadOnly(tools);

    const news = await tools.fetchNews();
    expect(news).toHaveLength(1);
    expect(news[0]?.id).toBe(sampleNews.id);

    await tools.readGraph();
    await tools.readProfile();
    expect(loadGraph).toHaveBeenCalledOnce();
    expect(loadUserProfile).toHaveBeenCalledOnce();

    await tools.summarize(sampleNews);
    expect(summarizeSpy).toHaveBeenCalledWith(sampleNews);
  });
});

describe("runAgentJob", () => {
  it("produces non-empty proposals from mock news without storage writes", async () => {
    const loadGraph = vi.fn().mockResolvedValue({ nodes: [], edges: [] });
    const loadUserProfile = vi.fn().mockResolvedValue(DEFAULT_USER_PROFILE);
    const saveConcept = vi.fn();
    const saveUserProfile = vi.fn();

    const tools = createAgentTools({
      llm: createMockLlmProvider(),
      news: createNewsSourceRegistry([createMockNewsSource()]),
      readGraph: loadGraph,
      readProfile: loadUserProfile,
    });

    const result: AgentRunResult = await runAgentJob(
      probeIngestJob,
      tools,
      new AbortController().signal,
    );

    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals.every((p) => p.status === "pending")).toBe(true);
    expect(result.proposals.every((p) => p.source === "background_ingest")).toBe(
      true,
    );
    expect(result.digest).not.toBeNull();
    expect(result.trace.length).toBeGreaterThanOrEqual(3);
    expect(result.trace.some((step) => step.name === "fetchNews")).toBe(true);
    expect(result.trace.some((step) => step.name === "propose")).toBe(true);

    expect(loadGraph).toHaveBeenCalled();
    expect(loadUserProfile).toHaveBeenCalled();
    expect(saveConcept).not.toHaveBeenCalled();
    expect(saveUserProfile).not.toHaveBeenCalled();
  });

  it("throws when signal is already aborted", async () => {
    const tools = createAgentTools({
      llm: createMockLlmProvider(),
      news: createNewsSourceRegistry([createMockNewsSource()]),
      readGraph: async () => ({ nodes: [], edges: [] }),
      readProfile: async () => DEFAULT_USER_PROFILE,
    });

    const controller = new AbortController();
    controller.abort();

    await expect(
      runAgentJob(probeIngestJob, tools, controller.signal),
    ).rejects.toMatchObject({ name: "AgentRunAbortedError" });
  });

  it("returns empty proposals when fetch yields no items", async () => {
    const tools = createAgentTools({
      llm: createMockLlmProvider(),
      news: createNewsSourceRegistry([createMockNewsSource([])]),
      readGraph: async () => ({ nodes: [], edges: [] }),
      readProfile: async () => DEFAULT_USER_PROFILE,
    });

    const result = await runAgentJob(
      probeIngestJob,
      tools,
      new AbortController().signal,
    );

    expect(result.proposals).toHaveLength(0);
    expect(result.digest).toBeNull();
  });
});

describe("Agent kernel invariants (AGENT.md §9)", () => {
  it("AgentTools type has no write methods at runtime", () => {
    const tools = createAgentTools({
      llm: createMockLlmProvider(),
      news: createNewsSourceRegistry([createMockNewsSource()]),
      readGraph: async () => ({ nodes: [], edges: [] }),
      readProfile: async () => DEFAULT_USER_PROFILE,
    });
    expect(() => assertAgentToolsReadOnly(tools)).not.toThrow();
  });

  it("runner does not import storage write or graph mutation paths", () => {
    const runner = readRepoSource("src/agent/runner.ts");
    expect(runner).not.toContain("StorageProvider");
    expect(runner).not.toContain("persistGraphSnapshot");
    expect(runner).not.toContain("applyGraphMutation");
  });

  it("tools wires read-only storage slice, not full StorageProvider", () => {
    const tools = readRepoSource("src/agent/tools.ts");
    expect(tools).not.toContain("StorageProvider");
    expect(tools).not.toContain("persistGraphSnapshot");
    expect(tools).not.toContain("applyGraphMutation");
    expect(tools).toContain("AgentReadStorage");
  });
});
