import { create } from "zustand";
import type { CognitiveAction } from "@/domain/actions/cognitiveAction";

interface WritingResearchState {
  open: boolean;
  actions: CognitiveAction[];
  openWritingResearch: (actions: CognitiveAction[]) => void;
  closeWritingResearch: () => void;
  clear: () => void;
}

/** Volatile overlay state for blog/research drafts (KOS-E3 — read-only display). */
export const useWritingResearchStore = create<WritingResearchState>((set) => ({
  open: false,
  actions: [],
  openWritingResearch: (actions) => set({ open: true, actions }),
  closeWritingResearch: () => set({ open: false, actions: [] }),
  clear: () => set({ open: false, actions: [] }),
}));
