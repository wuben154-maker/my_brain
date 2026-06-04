import { beforeEach, describe, expect, it } from "vitest";
import type { NewsItem } from "@/domain/news";
import {
  applyIngestCreate,
  applyIngestDecision,
  buildCreateProposalFromNews,
  persistProposalToGraph,
} from "@/conversation/ingestActions";
import { createTempStorage } from "@/invariants/testStorage";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
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

describe("ingestActions", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
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
      expect(node?.sourceUrl).toBe(newsItem.sourceUrl);
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
      expect(graph.nodes[0]?.sourceUrl).toBe("https://example.com/node");
    } finally {
      cleanup();
    }
  });
});
