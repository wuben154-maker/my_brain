import { create } from "zustand";
import type { CognitiveAction } from "@/domain/actions/cognitiveAction";

interface ProjectSuggestionsState {
  open: boolean;
  actions: CognitiveAction[];
  openSuggestions: (actions: CognitiveAction[]) => void;
  closeSuggestions: () => void;
  clear: () => void;
}

/** Volatile overlay state for project suggestion drafts (KOS-E2 — read-only display). */
export const useProjectSuggestionsStore = create<ProjectSuggestionsState>((set) => ({
  open: false,
  actions: [],
  openSuggestions: (actions) => set({ open: true, actions }),
  closeSuggestions: () => set({ open: false, actions: [] }),
  clear: () => set({ open: false, actions: [] }),
}));
