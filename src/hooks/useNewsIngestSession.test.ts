/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import { createTempStorage } from "@/invariants/testStorage";
import { useNewsIngestSession } from "@/hooks/useNewsIngestSession";
import { useAppStore } from "@/stores/appStore";
import { useIngestStore } from "@/stores/ingestStore";

const proposalA: GraphMutationProposal = {
  id: "ingest-create-a",
  kind: "create",
  summary: "新建概念 A",
  payload: { title: "概念 A", intro: "简介 A", sourceUrl: null },
};

const proposalB: GraphMutationProposal = {
  id: "ingest-create-b",
  kind: "create",
  summary: "新建概念 B",
  payload: { title: "概念 B", intro: "简介 B", sourceUrl: null },
};

describe("useNewsIngestSession confirmProposal", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
    useAppStore.setState({
      phase: "ready",
      newsQueue: [],
      providers: null,
      storage: null,
    });
  });

  it("applies one proposal per confirm and shifts to the next", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      useAppStore.setState({ storage, phase: "ready" });
      useIngestStore.getState().setActiveNewsId("news-1");
      useIngestStore.getState().setPendingProposals([proposalA, proposalB]);

      const { result } = renderHook(() => useNewsIngestSession());

      await act(async () => {
        await result.current.confirmProposal();
      });

      const afterFirst = await storage.loadGraph();
      expect(afterFirst.nodes.some((node) => node.title === "概念 A")).toBe(true);
      expect(afterFirst.nodes.some((node) => node.title === "概念 B")).toBe(false);

      const midState = useIngestStore.getState();
      expect(midState.pendingProposal?.id).toBe(proposalB.id);
      expect(midState.ingestedIds).toHaveLength(0);
      expect(midState.phase).toBe("confirming");

      await act(async () => {
        await result.current.confirmProposal();
      });

      const afterSecond = await storage.loadGraph();
      expect(afterSecond.nodes.some((node) => node.title === "概念 B")).toBe(true);

      const finalState = useIngestStore.getState();
      expect(finalState.pendingProposal).toBeNull();
      expect(finalState.ingestedIds).toEqual(["news-1"]);
      expect(finalState.phase).toBe("awaiting_ingest");
    } finally {
      cleanup();
    }
  });
});

describe("useNewsIngestSession rejectProposal", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
    useAppStore.setState({
      phase: "ready",
      newsQueue: [],
      providers: null,
      storage: null,
    });
  });

  it("clears pending without marking ingested when nothing was applied", () => {
    useIngestStore.getState().setActiveNewsId("news-1");
    useIngestStore.getState().setPendingProposals([proposalA, proposalB]);

    const { result } = renderHook(() => useNewsIngestSession());

    act(() => {
      result.current.rejectProposal();
    });

    const state = useIngestStore.getState();
    expect(state.pendingProposal).toBeNull();
    expect(state.ingestedIds).toHaveLength(0);
    expect(state.cursor).toBe(0);
    expect(state.phase).toBe("awaiting_ingest");
  });

  it("marks ingested and advances cursor after partial confirm then reject", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      useAppStore.setState({
        storage,
        phase: "ready",
        newsQueue: [
          {
            id: "news-1",
            category: "ai_news",
            title: "资讯一",
            summary: "摘要一",
            sourceName: "RSS",
            sourceUrl: "https://example.com/1",
            publishedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
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
    } finally {
      cleanup();
    }
  });
});
