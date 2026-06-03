/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import { createTempStorage } from "@/invariants/testStorage";
import { useManualGraphOps } from "@/hooks/useManualGraphOps";
import { useAppStore } from "@/stores/appStore";
import { useManualGraphStore } from "@/stores/manualGraphStore";

const proposalA: GraphMutationProposal = {
  id: "manual-create-a",
  kind: "create",
  summary: "手动新建概念 A",
  payload: { title: "概念 A", intro: "简介 A", sourceUrl: null },
};

const proposalB: GraphMutationProposal = {
  id: "manual-create-b",
  kind: "create",
  summary: "手动新建概念 B",
  payload: { title: "概念 B", intro: "简介 B", sourceUrl: null },
};

describe("useManualGraphOps confirmProposals", () => {
  beforeEach(() => {
    useManualGraphStore.getState().clearPending();
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
      useManualGraphStore.getState().setPendingProposals([proposalA, proposalB]);

      const { result } = renderHook(() => useManualGraphOps());

      await act(async () => {
        await result.current.confirmProposals();
      });

      const afterFirst = await storage.loadGraph();
      expect(afterFirst.nodes.some((node) => node.title === "概念 A")).toBe(true);
      expect(afterFirst.nodes.some((node) => node.title === "概念 B")).toBe(false);

      const midState = useManualGraphStore.getState();
      expect(midState.pendingProposal?.id).toBe(proposalB.id);
      expect(midState.pendingProposalQueue).toHaveLength(1);

      await act(async () => {
        await result.current.confirmProposals();
      });

      const afterSecond = await storage.loadGraph();
      expect(afterSecond.nodes.some((node) => node.title === "概念 B")).toBe(true);

      const finalState = useManualGraphStore.getState();
      expect(finalState.pendingProposal).toBeNull();
      expect(finalState.pendingProposalQueue).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("queues manual proposals without auto-apply", () => {
    useManualGraphStore.getState().setPendingProposals([proposalA]);
    expect(useManualGraphStore.getState().pendingProposal?.id).toBe(proposalA.id);
    expect(useManualGraphStore.getState().pendingProposalQueue).toHaveLength(1);
  });
});
