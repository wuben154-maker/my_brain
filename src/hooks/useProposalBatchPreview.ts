import { useCallback } from "react";
import type { ProposalEnvelope } from "@/agent/types";
import { buildProposalBatchPreview } from "@/lib/proposalPreview";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";

/** Apply or clear batch proposal preview on the active graph view (B3). */
export function useProposalBatchPreview() {
  const storage = useAppStore((state) => state.storage);

  const previewBatch = useCallback(
    async (envelopes: ProposalEnvelope[]) => {
      if (envelopes.length === 0) {
        useGraphStore.getState().clearProposalPreview();
        return;
      }
      const graph = storage
        ? await storage.loadGraph()
        : {
            nodes: useGraphStore.getState().nodes,
            edges: useGraphStore.getState().edges,
          };
      const overlay = buildProposalBatchPreview(
        graph,
        envelopes.map((item) => item.proposal),
      );
      useGraphStore
        .getState()
        .setProposalPreview(
          overlay.highlightedNodeIds,
          overlay.highlightedEdgeIds,
          overlay.ghostNodes,
          overlay.ghostEdges,
        );
    },
    [storage],
  );

  const clearPreview = useCallback(() => {
    useGraphStore.getState().clearProposalPreview();
  }, []);

  return { previewBatch, clearPreview };
}
