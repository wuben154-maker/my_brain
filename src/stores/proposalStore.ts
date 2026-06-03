import { create } from "zustand";
import type { ProposalEnvelope } from "@/agent/types";
import {
  applyProposalFeedback,
  proposalTopicHint,
} from "@/agent/profile/feedbackSignals";
import { applyGraphMutation, persistGraphSnapshot } from "@/lib/graphMutations";
import { resolveProposalForApply } from "@/lib/resolveProposalForApply";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import type { StorageProvider } from "@/storage/types";
import { useProfileStore } from "@/stores/profileStore";

async function persistProposalFeedback(
  storage: StorageProvider,
  envelope: ProposalEnvelope,
  status: "approved" | "rejected",
): Promise<void> {
  const topicHint = proposalTopicHint(envelope.proposal);
  const current = await storage.loadUserProfile();
  const next = applyProposalFeedback(current, [
    {
      source: envelope.source,
      kind: envelope.proposal.kind,
      status,
      topicHint,
    },
  ]);
  useProfileStore.getState().setProfile(next);
  await storage.saveUserProfile(next);
}

interface ProposalState {
  pending: ProposalEnvelope[];
  load: (storage: StorageProvider) => Promise<void>;
  approve: (
    storage: StorageProvider,
    graphStorage: StorageProvider,
    id: string,
  ) => Promise<void>;
  reject: (storage: StorageProvider, id: string) => Promise<void>;
  reset: () => void;
}

export const useProposalStore = create<ProposalState>((set, get) => ({
  pending: [],

  reset: () => set({ pending: [] }),

  load: async (storage) => {
    const pending = await storage.listPendingProposals();
    set({ pending });
  },

  approve: async (storage, graphStorage, id) => {
    let envelope = get().pending.find((item) => item.id === id);
    if (!envelope) {
      const fromStorage = await storage.listPendingProposals();
      envelope = fromStorage.find((item) => item.id === id);
    }
    if (!envelope) {
      throw new Error(`待确认提议不存在：${id}`);
    }

    try {
      const before = await graphStorage.loadGraph();
      const pending =
        get().pending.length > 0
          ? get().pending
          : await storage.listPendingProposals();
      const resolved = resolveProposalForApply(envelope.proposal, {
        graph: before,
        pending,
        runId: envelope.runId,
        envelopeId: envelope.id,
      });
      const after = applyGraphMutation(before, resolved);
      await persistGraphSnapshot(graphStorage, before, after);
      await syncDisplayGraph(graphStorage);
      await storage.setProposalStatus(id, "approved");
      await persistProposalFeedback(storage, envelope, "approved");
      set({ pending: get().pending.filter((item) => item.id !== id) });
    } catch (error) {
      try {
        await storage.setProposalStatus(id, "expired");
      } catch {
        // Proposal row may already be gone; still drop from memory queue.
      }
      set({ pending: get().pending.filter((item) => item.id !== id) });
      throw error;
    }
  },

  reject: async (storage, id) => {
    const envelope = get().pending.find((item) => item.id === id);
    await storage.setProposalStatus(id, "rejected");
    if (envelope) {
      await persistProposalFeedback(storage, envelope, "rejected");
    }
    set({ pending: get().pending.filter((item) => item.id !== id) });
  },
}));
