import { create } from "zustand";
import type { WeeklyBrainReview } from "@/domain/review/weeklyBrainReview";

interface WeeklyReviewState {
  open: boolean;
  review: WeeklyBrainReview | null;
  openReview: (review: WeeklyBrainReview) => void;
  closeReview: () => void;
  clear: () => void;
}

/** Volatile overlay state for weekly brain review (KOS-D3 — read-only). */
export const useWeeklyReviewStore = create<WeeklyReviewState>((set) => ({
  open: false,
  review: null,
  openReview: (review) => set({ open: true, review }),
  closeReview: () => set({ open: false, review: null }),
  clear: () => set({ open: false, review: null }),
}));
