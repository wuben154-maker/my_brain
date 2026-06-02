import { beforeEach, describe, expect, it } from "vitest";
import { useManualGraphStore } from "@/stores/manualGraphStore";

describe("useManualGraphOps flow (store)", () => {
  beforeEach(() => {
    useManualGraphStore.getState().clearPending();
  });

  it("queues manual proposals without auto-apply", () => {
    useManualGraphStore.getState().setPendingProposals([
      {
        id: "manual-create-1",
        kind: "create",
        summary: "手动新建",
        payload: { title: "RAG", intro: "检索增强", sourceUrl: null },
      },
    ]);
    expect(useManualGraphStore.getState().pendingProposals).toHaveLength(1);
  });
});
