import { create } from "zustand";
import type {
  BriefingFeedback,
  BriefingFeedbackKind,
  BriefingItem,
} from "@/domain/radar/briefingItem";

interface BriefingState {
  todayItems: BriefingItem[];
  feedbackByItemId: Record<string, BriefingFeedback[]>;
  setTodayItems: (items: BriefingItem[]) => void;
  recordFeedback: (input: {
    kind: BriefingFeedbackKind;
    worldItemId: string;
    at?: string;
  }) => void;
  getFeedbackForItem: (worldItemId: string) => BriefingFeedback[];
  clear: () => void;
}

export const useBriefingStore = create<BriefingState>((set, get) => ({
  todayItems: [],
  feedbackByItemId: {},
  setTodayItems: (todayItems) => set({ todayItems }),
  recordFeedback: ({ kind, worldItemId, at }) => {
    const feedback: BriefingFeedback = {
      kind,
      worldItemId,
      at: at ?? new Date().toISOString(),
    };
    set((state) => {
      const existing = state.feedbackByItemId[worldItemId] ?? [];
      return {
        feedbackByItemId: {
          ...state.feedbackByItemId,
          [worldItemId]: [...existing, feedback],
        },
      };
    });
  },
  getFeedbackForItem: (worldItemId) => get().feedbackByItemId[worldItemId] ?? [],
  clear: () => set({ todayItems: [], feedbackByItemId: {} }),
}));
