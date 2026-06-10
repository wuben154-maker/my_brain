import { useCallback } from "react";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import { computeReviewWindow } from "@/domain/review/reviewWindow";
import { learningTraceStore } from "@/learning/learningTraceStore";
import { useGraphStore } from "@/stores/graphStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useProfileStore } from "@/stores/profileStore";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

export interface OpenWeeklyBrainReviewOptions {
  /** Settings legacy overlay bridge; default opens companion review slot. */
  legacyOverlay?: boolean;
}

/** Build review from current stores and open companion review slot (no writes). */
export function useOpenWeeklyBrainReview(): (
  options?: OpenWeeklyBrainReviewOptions,
) => void {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const history = useGraphHistoryStore((state) => state.entries);
  const profile = useProfileStore((state) => state.profile);
  const lastReviewAt = useWeeklyReviewStore((state) => state.lastReviewAt);
  const openReview = useWeeklyReviewStore((state) => state.openReview);
  const openLegacyReview = useWeeklyReviewStore((state) => state.openLegacyReview);

  return useCallback(
    (options?: OpenWeeklyBrainReviewOptions) => {
      const now = new Date().toISOString();
      const weekRange = computeReviewWindow(lastReviewAt, now);
      const review = buildWeeklyBrainReview({
        graph: { nodes, edges },
        history,
        traces: learningTraceStore.listAll(),
        profile,
        weekRange,
        generatedAt: now,
      });
      if (options?.legacyOverlay) {
        openLegacyReview(review);
      } else {
        openReview(review);
      }
    },
    [nodes, edges, history, profile, lastReviewAt, openReview, openLegacyReview],
  );
}
