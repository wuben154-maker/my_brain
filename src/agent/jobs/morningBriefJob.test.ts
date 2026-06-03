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
import { createTokenBudget } from "@/agent/budget";
import { sortNewsForBrief } from "@/agent/curation/scoreNews";
import {
  createMorningBriefJob,
  DEFAULT_MORNING_BRIEF_CONFIG,
  MORNING_BRIEF_STEP_TOKENS,
} from "./morningBriefJob";

function createMockNewsSource(items: NewsItem[]): NewsSource {
  return {
    id: "mock-brief-news",
    label: "Mock Brief",
    async fetchLatest() {
      return {
        sourceId: "mock-brief-news",
        fetchedAt: new Date().toISOString(),
        items,
      };
    },
  };
}

function makeNewsItem(index: number, overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: `news-${index}`,
    title: `Headline ${index}`,
    summary: `Summary for item ${index}`,
    sourceName: "Mock RSS",
    sourceUrl: `https://example.com/news-${index}`,
    category: "ai_news",
    publishedAt: `2026-06-0${Math.min(index + 1, 9)}T00:00:00.000Z`,
    ...overrides,
  };
}

function createBriefTools(
  items: NewsItem[],
  readGraph: () => Promise<BrainGraphSnapshot> = async () => ({
    nodes: [],
    edges: [],
  }),
) {
  const loadGraph = vi.fn<() => Promise<BrainGraphSnapshot>>(readGraph);
  const loadUserProfile = vi.fn().mockResolvedValue(DEFAULT_USER_PROFILE);
  const saveConcept = vi.fn();

  const tools = createAgentTools({
    llm: createMockLlmProvider(),
    news: createNewsSourceRegistry([createMockNewsSource(items)]),
    readGraph: loadGraph,
    readProfile: loadUserProfile,
  });

  return { tools, loadGraph, loadUserProfile, saveConcept };
}

describe("sortNewsForBrief", () => {
  it("orders by publishedAt descending, then sourceName", () => {
    const sorted = sortNewsForBrief([
      makeNewsItem(1, {
        publishedAt: "2026-06-01T00:00:00.000Z",
        sourceName: "B",
      }),
      makeNewsItem(2, {
        publishedAt: "2026-06-03T00:00:00.000Z",
        sourceName: "A",
      }),
      makeNewsItem(3, {
        publishedAt: "2026-06-03T00:00:00.000Z",
        sourceName: "Z",
      }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["news-2", "news-3", "news-1"]);
  });
});

describe("MorningBriefJob", () => {
  it("produces digest sections matching processed items and pending proposals under mock", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1)];
    const { tools, loadGraph, loadUserProfile, saveConcept } =
      createBriefTools(items);

    const job = createMorningBriefJob({ topN: 5, maxProposals: 10 });
    const result = await runAgentJob(job, tools, new AbortController().signal);

    expect(result.digest).not.toBeNull();
    expect(result.digest?.sections.length).toBe(2);
    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals.every((p) => p.status === "pending")).toBe(true);
    expect(result.proposals.every((p) => p.source === "background_ingest")).toBe(
      true,
    );
    expect(result.trace.some((step) => step.name === "fetchNews")).toBe(true);
    expect(result.trace.some((step) => step.name === "dedupeAgainstGraph")).toBe(
      true,
    );
    expect(result.trace.some((step) => step.name === "propose")).toBe(true);

    expect(loadGraph).toHaveBeenCalled();
    expect(loadUserProfile).toHaveBeenCalled();
    expect(saveConcept).not.toHaveBeenCalled();
    assertAgentToolsReadOnly(tools);
  });

  it("filters news already present in graph via dedupeAgainstGraph", async () => {
    const duplicateUrl = "https://example.com/news-0";
    const items = [
      makeNewsItem(0, { sourceUrl: duplicateUrl }),
      makeNewsItem(1, { sourceUrl: "https://example.com/news-1" }),
    ];
    const { tools } = createBriefTools(items, async () => ({
      nodes: [
        {
          id: "existing",
          title: "Unrelated",
          intro: "i",
          sourceUrl: duplicateUrl,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
    }));

    const result = await runAgentJob(
      createMorningBriefJob({ topN: 5 }),
      tools,
      new AbortController().signal,
    );

    expect(result.digest?.sections).toHaveLength(1);
    expect(result.digest?.sections[0]?.headline).toBe("Headline 1");
  });

  it("truncates when cumulative tokens exceed tokenBudgetPerRun", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1), makeNewsItem(2)];
    const { tools } = createBriefTools(items);

    const perItem =
      MORNING_BRIEF_STEP_TOKENS.summarize + MORNING_BRIEF_STEP_TOKENS.propose;
    const budget = perItem * 2;

    const result = await runAgentJob(
      createMorningBriefJob({ topN: 5, tokenBudgetPerRun: budget }),
      tools,
      new AbortController().signal,
    );

    expect(result.digest?.sections.length).toBe(2);
    expect(result.trace.some((step) => step.name === "budget_truncated")).toBe(
      true,
    );
  });

  it("truncates proposals at maxProposals", async () => {
    const items = Array.from({ length: 5 }, (_, index) => makeNewsItem(index));
    const { tools } = createBriefTools(items);

    const result = await runAgentJob(
      createMorningBriefJob({ topN: 5, maxProposals: 2, tokenBudgetPerRun: 50_000 }),
      tools,
      new AbortController().signal,
    );

    expect(result.proposals).toHaveLength(2);
    expect(result.digest?.sections.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty proposals and null digest when fetch yields no items", async () => {
    const { tools } = createBriefTools([]);

    const result = await runAgentJob(
      createMorningBriefJob(),
      tools,
      new AbortController().signal,
    );

    expect(result.proposals).toHaveLength(0);
    expect(result.digest).toBeNull();
    expect(result.trace.some((step) => step.name === "fetchNews")).toBe(true);
  });

  it("throws AgentRunAbortedError when signal aborts mid-run", async () => {
    const items = [makeNewsItem(0)];
    const controller = new AbortController();

    const tools = createAgentTools({
      llm: createMockLlmProvider(),
      news: createNewsSourceRegistry([createMockNewsSource(items)]),
      readGraph: async () => ({ nodes: [], edges: [] }),
      readProfile: async () => DEFAULT_USER_PROFILE,
    });

    const originalSummarize = tools.summarize.bind(tools);
    tools.summarize = async (item) => {
      controller.abort();
      return originalSummarize(item);
    };

    await expect(
      runAgentJob(createMorningBriefJob(), tools, controller.signal),
    ).rejects.toBeInstanceOf(AgentRunAbortedError);
  });

  it("returns early with budget_day_cap when daily cap is reached (H1)", async () => {
    const items = [makeNewsItem(0)];
    const { tools } = createBriefTools(items);
    const budget = createTokenBudget({
      perRun: DEFAULT_MORNING_BRIEF_CONFIG.tokenBudgetPerRun,
      perDay: 50,
      loadTodaySpent: () => 50,
      recordSpend: () => undefined,
    });

    const result = await runAgentJob(
      createMorningBriefJob({ budget, topN: 5 }),
      tools,
      new AbortController().signal,
    );

    expect(result.trace.some((step) => step.name === "budget_day_cap")).toBe(
      true,
    );
    expect(result.proposals).toHaveLength(0);
  });

  it("keeps sum(trace.tokensUsed) within perRun when using TokenBudget (H1)", async () => {
    const items = [makeNewsItem(0), makeNewsItem(1), makeNewsItem(2)];
    const { tools } = createBriefTools(items);
    const perRun = 350;
    const budget = createTokenBudget({
      perRun,
      perDay: 50_000,
      loadTodaySpent: () => 0,
      recordSpend: () => undefined,
    });

    const result = await runAgentJob(
      createMorningBriefJob({ budget, topN: 5 }),
      tools,
      new AbortController().signal,
    );

    const total = result.trace.reduce(
      (sum, step) => sum + (step.tokensUsed ?? 0),
      0,
    );
    expect(total).toBeLessThanOrEqual(perRun);
    expect(result.trace.some((step) => step.name === "budget_truncated")).toBe(
      true,
    );
  });

  it("orders digest by profile scoring (C1)", async () => {
    const items = [
      makeNewsItem(0, { title: "Transformer 架构速览" }),
      makeNewsItem(1, { title: "RAG 检索增强实践" }),
    ];
    const profile = {
      ...DEFAULT_USER_PROFILE,
      interests: ["RAG"],
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const loadUserProfile = vi.fn().mockResolvedValue(profile);
    const tools = createAgentTools({
      llm: createMockLlmProvider(),
      news: createNewsSourceRegistry([createMockNewsSource(items)]),
      readGraph: async () => ({ nodes: [], edges: [] }),
      readProfile: loadUserProfile,
    });

    const result = await runAgentJob(
      createMorningBriefJob({ topN: 1 }),
      tools,
      new AbortController().signal,
    );

    expect(result.digest?.sections[0]?.headline).toBe("RAG 检索增强实践");
    expect(result.digest?.sections[0]?.body).toContain("【标准】");
  });

  it("does not import storage write or graph mutation paths", () => {
    const jobSource = readRepoSource("src/agent/jobs/morningBriefJob.ts");
    expect(jobSource).not.toContain("StorageProvider");
    expect(jobSource).not.toContain("persistGraphSnapshot");
    expect(jobSource).not.toContain("applyGraphMutation");
    expect(jobSource).not.toContain("saveProposal");
  });
});
