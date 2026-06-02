import { create } from "zustand";
import type { ProposalEnvelope } from "@/agent/types";
import { applyGraphMutation, persistGraphSnapshot } from "@/lib/graphMutations";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import type { StorageProvider } from "@/storage/types";

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
      // Same sequence as useManualGraphOps.applyProposal / useNewsIngestSession.
      const before = await graphStorage.loadGraph();
      const after = applyGraphMutation(before, envelope.proposal);
      await persistGraphSnapshot(graphStorage, before, after);
      await syncDisplayGraph(graphStorage);
      await storage.setProposalStatus(id, "approved");
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
    await storage.setProposalStatus(id, "rejected");
    set({ pending: get().pending.filter((item) => item.id !== id) });
  },
}));
