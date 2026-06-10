import type { UserProfile } from "@/domain/profile";
import { isFieldUserCorrected } from "@/domain/profile/userProfile";
import {
  isBriefingFeedbackExcluded,
  type BriefingFeedback,
} from "@/domain/radar/briefingItem";
import type { WorldItemScored } from "@/domain/radar/radarSignal";

/** Fixture mapping: corrected interest id → world item excluded by feedback. */
const INTEREST_CORRECTION_FEEDBACK_OVERRIDES: Record<string, string> = {
  voice_realtime: "radar-wi-rel-1",
};

/**
 * KP-05 / KOS-C2: explicit profile correction beats item-level exclusion feedback.
 * correction > item feedback > distillation
 */
export function feedbackBlockedByProfileCorrection(
  profile: UserProfile,
  worldItemId: string,
  feedback: BriefingFeedback,
): boolean {
  if (!isBriefingFeedbackExcluded(feedback.kind)) {
    return false;
  }
  for (const [interestId, itemId] of Object.entries(
    INTEREST_CORRECTION_FEEDBACK_OVERRIDES,
  )) {
    if (
      itemId === worldItemId &&
      isFieldUserCorrected(profile.correctedFields, `interest.${interestId}`)
    ) {
      return true;
    }
  }
  return false;
}

export function applyBriefingFeedbackWithProfilePriority(
  ranked: WorldItemScored[],
  profile: UserProfile,
  feedbackByItemId: Record<string, BriefingFeedback[]>,
): WorldItemScored[] {
  const excludedIds = new Set<string>();
  for (const [itemId, feedbacks] of Object.entries(feedbackByItemId)) {
    const shouldExclude = feedbacks.some(
      (feedback) =>
        isBriefingFeedbackExcluded(feedback.kind) &&
        !feedbackBlockedByProfileCorrection(profile, itemId, feedback),
    );
    if (shouldExclude) {
      excludedIds.add(itemId);
    }
  }

  const adjusted = ranked.map((entry) =>
    excludedIds.has(entry.item.id) ? { ...entry, score: 0 } : entry,
  );

  return sortRanked(adjusted);
}

function sortRanked(entries: WorldItemScored[]): WorldItemScored[] {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.item.id.localeCompare(right.item.id);
  });
}
