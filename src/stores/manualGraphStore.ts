import { create } from "zustand";
import type { GraphMutationProposal } from "@/domain/graph";

interface ManualGraphState {
  pendingProposal: GraphMutationProposal | null;
  pendingProposalQueue: GraphMutationProposal[];
  setPendingProposals: (proposals: GraphMutationProposal[]) => void;
  clearPending: () => void;
  shiftPendingProposal: () => GraphMutationProposal | null;
}

export const useManualGraphStore = create<ManualGraphState>((set, get) => ({
  pendingProposal: null,
  pendingProposalQueue: [],
  setPendingProposals: (proposals) =>
    set({
      pendingProposalQueue: proposals,
      pendingProposal: proposals[0] ?? null,
    }),
  clearPending: () =>
    set({
      pendingProposal: null,
      pendingProposalQueue: [],
    }),
  shiftPendingProposal: () => {
    const queue = [...get().pendingProposalQueue];
    queue.shift();
    const next = queue[0] ?? null;
    set({
      pendingProposalQueue: queue,
      pendingProposal: next,
    });
    return next;
  },
}));
