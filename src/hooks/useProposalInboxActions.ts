import { useCallback, useState } from "react";
import type { ProposalEnvelope } from "@/agent/types";
import {
  applyGraphMutation,
  primaryNodeIdFromProposal,
} from "@/lib/graphMutations";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import { useProposalStore } from "@/stores/proposalStore";

export function useProposalInboxActions() {
  const storage = useAppStore((state) => state.storage);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewProposal = useCallback(
    async (envelope: ProposalEnvelope) => {
      const graph = storage
        ? await storage.loadGraph()
        : readVisualSnapshotId() === "inbox"
          ? {
              nodes: useGraphStore.getState().nodes,
              edges: useGraphStore.getState().edges,
            }
          : null;
      if (!graph) {
        return;
      }
      const nodeId = primaryNodeIdFromProposal(envelope.proposal, graph);
      if (nodeId) {
        useGraphStore.getState().setHighlights([nodeId], []);
        useGraphStore.getState().selectNode(nodeId);
      } else {
        useGraphStore.getState().clearHighlights();
      }
    },
    [storage],
  );

  const clearPreview = useCallback(() => {
    useGraphStore.getState().clearHighlights();
  }, []);

  const approve = useCallback(
    async (id: string) => {
      const visualInbox = readVisualSnapshotId() === "inbox";
      if (!storage && visualInbox) {
        const envelope = useProposalStore
          .getState()
          .pending.find((item) => item.id === id);
        if (!envelope) {
          return;
        }
        setBusyId(id);
        setErrorMessage(null);
        try {
          const snapshot = {
            nodes: useGraphStore.getState().nodes,
            edges: useGraphStore.getState().edges,
          };
          const after = applyGraphMutation(snapshot, envelope.proposal);
          useGraphStore.getState().setGraph(after);
          useProposalStore.setState({
            pending: useProposalStore
              .getState()
              .pending.filter((item) => item.id !== id),
          });
          clearPreview();
        } finally {
          setBusyId(null);
        }
        return;
      }
      if (!storage) {
        setErrorMessage("本地存储未就绪");
        return;
      }
      setBusyId(id);
      setErrorMessage(null);
      try {
        await useProposalStore
          .getState()
          .approve(storage, storage, id);
        clearPreview();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "确认入库失败",
        );
      } finally {
        setBusyId(null);
      }
    },
    [storage, clearPreview],
  );

  const reject = useCallback(
    async (id: string) => {
      if (!storage) {
        setErrorMessage("本地存储未就绪");
        return;
      }
      setBusyId(id);
      setErrorMessage(null);
      try {
        await useProposalStore.getState().reject(storage, id);
        clearPreview();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "拒绝失败",
        );
      } finally {
        setBusyId(null);
      }
    },
    [storage, clearPreview],
  );

  return {
    busyId,
    errorMessage,
    previewProposal,
    clearPreview,
    approve,
    reject,
  };
}
