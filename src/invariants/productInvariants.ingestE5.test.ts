/**
 * Invariant E5: partial confirm then reject → markIngested, no re-propose.
 * @vitest-environment happy-dom
 *
 * @see productInvariants.test.ts — store-level resolution + full-reject baseline
 * @see useNewsIngestSession.test.ts — hook-focused confirm/reject suite
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import { useNewsIngestSession } from "@/hooks/useNewsIngestSession";
import { createTempStorage } from "@/invariants/testStorage";
import { createAppProviders } from "@/providers";
import { useAppStore } from "@/stores/appStore";
import {
  isNewsSessionComplete,
  resolveCurrentNewsItem,
  useIngestStore,
} from "@/stores/ingestStore";

const proposalA: GraphMutationProposal = {
  id: "e5-create-a",
  kind: "create",
  summary: "新建概念 A",
  payload: { title: "概念 A", intro: "简介 A", sourceUrl: null },
};

const proposalB: GraphMutationProposal = {
  id: "e5-create-b",
  kind: "create",
  summary: "新建概念 B",
  payload: { title: "概念 B", intro: "简介 B", sourceUrl: null },
};

const newsOne: NewsItem = {
  id: "news-1",
  category: "ai_news",
  title: "资讯一",
  summary: "摘要一",
  sourceName: "RSS",
  sourceUrl: "https://example.com/1",
  publishedAt: "2026-01-01T00:00:00.000Z",
};

describe("Product invariant E5 · partial confirm then reject", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
    useAppStore.setState({
      phase: "companion",
      newsQueue: [newsOne],
      providers: null,
      storage: null,
    });
  });

  it("marks ingested, advances cursor, and blocks requestIngest re-propose", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const providers = createAppProviders({ openAiApiKey: "" });
      useAppStore.setState({ storage, providers, phase: "companion", newsQueue: [newsOne] });
      useIngestStore.getState().setActiveNewsId("news-1");
      useIngestStore.getState().setPendingProposals([proposalA, proposalB]);

      const { result } = renderHook(() => useNewsIngestSession());

      await act(async () => {
        await result.current.confirmProposal();
      });

      act(() => {
        result.current.rejectProposal();
      });

      const graph = await storage.loadGraph();
      expect(graph.nodes.some((node) => node.title === "概念 A")).toBe(true);
      expect(graph.nodes.some((node) => node.title === "概念 B")).toBe(false);

      const state = useIngestStore.getState();
      expect(state.pendingProposal).toBeNull();
      expect(state.ingestedIds).toEqual(["news-1"]);
      expect(state.cursor).toBe(1);
      expect(result.current.currentItem).toBeNull();
      expect(result.current.sessionComplete).toBe(true);

      await act(async () => {
        await result.current.requestIngest();
      });

      const afterRePropose = useIngestStore.getState();
      expect(afterRePropose.pendingProposal).toBeNull();
      expect(afterRePropose.ingestedIds).toEqual(["news-1"]);
      expect(afterRePropose.phase).toBe("awaiting_ingest");
    } finally {
      cleanup();
    }
  });
});

describe("Product invariant E5 · ingest resolution (store)", () => {
  it("treats ingested ids as processed so cursor skips them", () => {
    const queue = [newsOne];
    expect(resolveCurrentNewsItem(queue, 1, [], ["news-1"])).toBeNull();
    expect(isNewsSessionComplete(queue, [], ["news-1"])).toBe(true);
  });
});
