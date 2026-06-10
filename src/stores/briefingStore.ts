import { create } from "zustand";
import type {
  BriefingFeedback,
  BriefingFeedbackKind,
  BriefingItem,
} from "@/domain/radar/briefingItem";
import { groupBriefingFeedbackByItemId } from "@/storage/briefingFeedbackRepo";
import type { StorageProvider } from "@/storage/types";

interface BriefingState {
  todayItems: BriefingItem[];
  feedbackByItemId: Record<string, BriefingFeedback[]>;
  isLoaded: boolean;
  persistWarning: boolean;
  setTodayItems: (items: BriefingItem[]) => void;
  loadFromStorage: (storage: StorageProvider) => Promise<void>;
  recordFeedback: (
    input: {
      kind: BriefingFeedbackKind;
      worldItemId: string;
      at?: string;
    },
    storage?: StorageProvider | null,
  ) => Promise<void>;
  getFeedbackForItem: (worldItemId: string) => BriefingFeedback[];
  clear: () => void;
}

async function persistBriefingFeedback(
  storage: StorageProvider | null | undefined,
  feedback: BriefingFeedback,
): Promise<boolean> {
  if (!storage) {
    return false;
  }
  try {
    await storage.saveBriefingFeedback(feedback);
    return true;
  } catch {
    return false;
  }
}

export const useBriefingStore = create<BriefingState>((set, get) => ({
  todayItems: [],
  feedbackByItemId: {},
  isLoaded: false,
  persistWarning: false,
  setTodayItems: (todayItems) => set({ todayItems }),
  loadFromStorage: async (storage) => {
    const rows = await storage.listBriefingFeedback();
    set({
      feedbackByItemId: groupBriefingFeedbackByItemId(rows),
      isLoaded: true,
      persistWarning: false,
    });
  },
  recordFeedback: async ({ kind, worldItemId, at }, storage) => {
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

    const saved = await persistBriefingFeedback(storage, feedback);
    if (storage && !saved) {
      set({ persistWarning: true });
    }
  },
  getFeedbackForItem: (worldItemId) => get().feedbackByItemId[worldItemId] ?? [],
  clear: () =>
    set({
      todayItems: [],
      feedbackByItemId: {},
      isLoaded: false,
      persistWarning: false,
    }),
}));
