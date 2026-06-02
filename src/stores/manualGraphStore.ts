import { create } from "zustand";
import type { GraphMutationProposal } from "@/domain/graph";

interface ManualGraphState {
  pendingProposals: GraphMutationProposal[];
  setPendingProposals: (proposals: GraphMutationProposal[]) => void;
  clearPending: () => void;
}

export const useManualGraphStore = create<ManualGraphState>((set) => ({
  pendingProposals: [],
  setPendingProposals: (pendingProposals) => set({ pendingProposals }),
  clearPending: () => set({ pendingProposals: [] }),
}));
