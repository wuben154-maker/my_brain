import { useCallback } from "react";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import {
  getIsoWeekId,
  weekRangeForIsoWeek,
} from "@/domain/review/weeklyBrainReview";
import { learningTraceStore } from "@/learning/learningTraceStore";
import { useGraphStore } from "@/stores/graphStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useProfileStore } from "@/stores/profileStore";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

/** Build review from current stores and open overlay (no writes). */
export function useOpenWeeklyBrainReview(): () => void {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const history = useGraphHistoryStore((state) => state.entries);
  const profile = useProfileStore((state) => state.profile);
  const openReview = useWeeklyReviewStore((state) => state.openReview);

  return useCallback(() => {
    const weekId = getIsoWeekId(new Date().toISOString());
    const weekRange = weekRangeForIsoWeek(weekId);
    const review = buildWeeklyBrainReview({
      graph: { nodes, edges },
      history,
      traces: learningTraceStore.listAll(),
      profile,
      weekRange,
    });
    openReview(review);
  }, [nodes, edges, history, profile, openReview]);
}
