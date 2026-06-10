import { create } from "zustand";
import type { ProvisionalNode } from "@/domain/provisional/provisionalNode";
import { isProvisionalExpired } from "@/domain/provisional/provisionalNode";

interface ProvisionalStoreState {
  candidates: ProvisionalNode[];
  upsertCandidate: (node: ProvisionalNode) => void;
  removeCandidate: (id: string) => void;
  listCandidates: () => ProvisionalNode[];
  purgeExpired: (nowIso?: string) => void;
  clearAll: () => void;
}

export const useProvisionalStore = create<ProvisionalStoreState>((set, get) => ({
  candidates: [],
  upsertCandidate: (node) => {
    set((state) => {
      const rest = state.candidates.filter((candidate) => candidate.id !== node.id);
      return { candidates: [...rest, node] };
    });
  },
  removeCandidate: (id) => {
    set((state) => ({
      candidates: state.candidates.filter((candidate) => candidate.id !== id),
    }));
  },
  listCandidates: () => get().candidates,
  purgeExpired: (nowIso) => {
    set((state) => ({
      candidates: state.candidates.filter(
        (candidate) => !isProvisionalExpired(candidate, nowIso),
      ),
    }));
  },
  clearAll: () => set({ candidates: [] }),
}));

/** Test/dev helper — reset provisional isolation store. */
export function resetProvisionalStoreForTests(): void {
  useProvisionalStore.setState({ candidates: [] });
}
