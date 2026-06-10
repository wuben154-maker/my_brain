import { create } from "zustand";
import type { WeeklyBrainReview } from "@/domain/review/weeklyBrainReview";

interface WeeklyReviewState {
  /** Legacy overlay flag (Settings bridge only). */
  open: boolean;
  /** KP-03 companion shell review slot. */
  companionOpen: boolean;
  review: WeeklyBrainReview | null;
  lastReviewAt: string | null;
  openReview: (review: WeeklyBrainReview) => void;
  openCompanionReview: (review: WeeklyBrainReview) => void;
  openLegacyReview: (review: WeeklyBrainReview) => void;
  closeReview: () => void;
  clear: () => void;
}

/** Volatile review state for weekly brain review (KOS-D3 / KP-03 — read-only). */
export const useWeeklyReviewStore = create<WeeklyReviewState>((set) => ({
  open: false,
  companionOpen: false,
  review: null,
  lastReviewAt: null,
  openReview: (review) =>
    set({
      companionOpen: true,
      open: false,
      review,
      lastReviewAt: review.generatedAt,
    }),
  openCompanionReview: (review) =>
    set({
      companionOpen: true,
      open: false,
      review,
      lastReviewAt: review.generatedAt,
    }),
  openLegacyReview: (review) =>
    set({
      companionOpen: false,
      open: true,
      review,
      lastReviewAt: review.generatedAt,
    }),
  closeReview: () => set({ open: false, companionOpen: false, review: null }),
  clear: () =>
    set({
      open: false,
      companionOpen: false,
      review: null,
      lastReviewAt: null,
    }),
}));
