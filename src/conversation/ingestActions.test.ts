import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewsItem } from "@/domain/news";
import {
  applyIngestCreate,
  applyIngestDecision,
  buildCreateProposalFromNews,
  persistProposalToGraph,
} from "@/conversation/ingestActions";
import { createFixtureContext } from "@/conversation/mockConversationFixtures";
import { nextOnboardingAfterEvent } from "@/conversation/nextTurn";
import { createTempStorage } from "@/invariants/testStorage";
import { visibleGraph } from "@/lib/graphMutations";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { isConceptNode, nodeSourceUrl } from "@/domain/graph";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useIngestStore } from "@/stores/ingestStore";
import { readCreatePayload } from "@/domain/graphMutationPayloads";

const newsItem: NewsItem = {
  id: "news-v3",
  category: "ai_news",
  title: "Context window expansion",
  summary: "Long document QA",
  sourceName: "Mock RSS",
  sourceUrl: "https://example.com/context-window",
  publishedAt: "2026-01-01T00:00:00.000Z",
};

const coldStartNews: NewsItem = {
  id: "cold-start-news",
  category: "ai_news",
  title: "Transformer 上下文窗口再扩展",
  summary: "更长 context 支持整本书级别输入。",
  sourceName: "Mock RSS",
  sourceUrl: "https://example.com/cold-start-context",
  publishedAt: "2026-06-01T00:00:00.000Z",
};

const autoCuratePeerNews: NewsItem = {
  id: "auto-curate-news-1",
  category: "ai_news",
  title: "上下文窗口扩展",
  summary: "长文档问答更稳。",
  sourceName: "Mock RSS",
  sourceUrl: "https://example.com/auto-curate-1",
  publishedAt: "2026-06-02T00:00:00.000Z",
};

const autoCuratePeerNews2: NewsItem = {
  id: "auto-curate-news-2",
  category: "github_trending",
  title: "agent-framework-starter-2",
  summary: "Another agent starter repo.",
  sourceName: "GitHub Trending",
  sourceUrl: "https://github.com/example/starter-2",
  publishedAt: "2026-06-03T00:00:00.000Z",
};

describe("ingestActions", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
    useGraphHistoryStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buildCreateProposalFromNews keeps sourceUrl and merges explanation", () => {
    const proposal = buildCreateProposalFromNews(
      newsItem,
      "explanation snippet",
      {
        id: "p1",
        kind: "create",
        summary: "create",
        payload: {
          title: "LLM context window",
          intro: "old intro",
          sourceUrl: null,
        },
      },
    );
    const payload = readCreatePayload(proposal.payload);
    expect(payload.sourceUrl).toBe(newsItem.sourceUrl);
    expect(payload.intro).toBe("explanation snippet");
  });

  it("applyIngestCreate persists node with source link", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      useIngestStore.getState().setExplanation("ingest explanation");
      const { nodeId } = await applyIngestCreate(newsItem, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });
      expect(nodeId).toBeTruthy();
      const graph = await storage.loadGraph();
      const node = graph.nodes.find((n) => n.id === nodeId);
      expect(node?.intro.length).toBeGreaterThan(0);
      expect(node && isConceptNode(node) ? node.sourceUrl : null).toBe(newsItem.sourceUrl);
    } finally {
      cleanup();
    }
  });

  it("applyIngestDecision skip marks skippedIds without graph write", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const result = await applyIngestDecision("skip", newsItem, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });
      expect(result.event).toEqual({
        type: "ingestAnswer",
        command: "skip",
      });
      expect(useIngestStore.getState().skippedIds).toContain(newsItem.id);
      const graph = await storage.loadGraph();
      expect(graph.nodes).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("applyIngestDecision ingest marks ingested and persists", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      useIngestStore.getState().setExplanation("confirm ingest");
      const result = await applyIngestDecision("ingest", newsItem, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });
      expect(result.event?.type).toBe("ingestAnswer");
      expect(useIngestStore.getState().ingestedIds).toContain(newsItem.id);
      const graph = await storage.loadGraph();
      expect(graph.nodes.length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it("applyIngestDecision elaborate bumps elaborationDepth", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const result = await applyIngestDecision("elaborate", newsItem, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });
      expect(result.event).toEqual({
        type: "ingestAnswer",
        command: "elaborate",
      });
      expect(useIngestStore.getState().elaborationDepth).toBe(1);
      expect(useIngestStore.getState().explanation.length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it("cold-start empty graph: voice ingest creates first star and onboarding.done", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      expect((await storage.loadGraph()).nodes).toHaveLength(0);

      const ctx = createFixtureContext({
        onboarding: { active: true, step: "first_star", interestRounds: 2 },
      });
      useIngestStore.getState().setExplanation("冷启动首颗星讲解");
      const result = await applyIngestDecision("ingest", coldStartNews, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });

      expect(result.event).toEqual({
        type: "ingestAnswer",
        command: "ingest",
      });
      const graph = visibleGraph(await storage.loadGraph());
      expect(graph.nodes).toHaveLength(1);
      const node = graph.nodes[0]!;
      expect(node.intro.length).toBeGreaterThan(0);
      expect(isConceptNode(node) && node.sourceUrl).toBe(coldStartNews.sourceUrl);

      const onboarding = nextOnboardingAfterEvent(ctx, {
        type: "ingestAnswer",
        command: "ingest",
      });
      expect(onboarding.active).toBe(false);
      expect(onboarding.step).toBe("done");
    } finally {
      cleanup();
    }
  });

  it("voice ingest runs autoCurate and emits throttled curation say line", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));

    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept({
        id: "stale-node",
        title: "过时条目",
        intro: "stale",
        sourceUrl: null,
        archived: false,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-06-01T00:00:00.000Z",
      });

      useIngestStore.getState().setExplanation("入库讲解");
      const first = await applyIngestDecision("ingest", autoCuratePeerNews, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });
      expect(first.curationEntries?.length).toBeGreaterThan(0);
      expect(first.turn.say.length).toBeGreaterThan(0);
      expect(
        (await storage.listGraphHistory()).some((row) => row.kind === "archive"),
      ).toBe(true);

      vi.advanceTimersByTime(5_000);
      useIngestStore.getState().setExplanation("第二条讲解");
      const second = await applyIngestDecision("ingest", autoCuratePeerNews2, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });
      expect(second.turn.say).toBe("");
    } finally {
      cleanup();
    }
  });

  it("persistProposalToGraph matches manual apply path", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const proposal = {
        id: "manual-create",
        kind: "create" as const,
        summary: "create",
        payload: {
          title: "Test Concept",
          intro: "intro",
          sourceUrl: "https://example.com/node",
        },
      };
      const nodeId = await persistProposalToGraph(storage, proposal);
      expect(nodeId).toBeTruthy();
      const graph = await storage.loadGraph();
      expect(nodeSourceUrl(graph.nodes[0]!)).toBe("https://example.com/node");
    } finally {
      cleanup();
    }
  });
});
