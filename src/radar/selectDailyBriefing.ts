import {
  type BriefingFeedback,
  type BriefingItem,
  isBriefingFeedbackExcluded,
  type BriefingRank,
} from "@/domain/radar/briefingItem";
import type { WorldItemScored } from "@/domain/radar/radarSignal";

export interface SelectDailyBriefingOptions {
  max?: number;
}

export interface BuildDailyBriefingInput {
  ranked: WorldItemScored[];
  feedbackByItemId?: Record<string, BriefingFeedback[]>;
  max?: number;
}

export function selectDailyBriefing(
  ranked: WorldItemScored[],
  options: SelectDailyBriefingOptions = {},
): BriefingItem[] {
  const max = options.max ?? 3;
  return ranked.slice(0, max).map((entry, index) => ({
    worldItem: entry.item,
    signals: entry.signals,
    briefingRank: (index + 1) as BriefingRank,
  }));
}

export function applyBriefingFeedbackToRanked(
  ranked: WorldItemScored[],
  feedbackByItemId: Record<string, BriefingFeedback[]>,
): WorldItemScored[] {
  const excludedIds = new Set<string>();
  for (const [itemId, feedbacks] of Object.entries(feedbackByItemId)) {
    if (feedbacks.some((feedback) => isBriefingFeedbackExcluded(feedback.kind))) {
      excludedIds.add(itemId);
    }
  }

  const adjusted = ranked.map((entry) =>
    excludedIds.has(entry.item.id) ? { ...entry, score: 0 } : entry,
  );

  return sortRanked(adjusted);
}

export function buildDailyBriefing(input: BuildDailyBriefingInput): BriefingItem[] {
  const adjusted = applyBriefingFeedbackToRanked(
    input.ranked,
    input.feedbackByItemId ?? {},
  );
  return selectDailyBriefing(adjusted, { max: input.max });
}

function sortRanked(entries: WorldItemScored[]): WorldItemScored[] {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.item.id.localeCompare(right.item.id);
  });
}
