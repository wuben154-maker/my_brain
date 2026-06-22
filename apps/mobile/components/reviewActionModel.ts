import type {
  GraphChangeRecord,
  GraphSnapshot,
  ReviewDraftAction,
  UserModeProfile,
  WeeklyReviewDraft,
} from "@my-brain/core";
import {
  buildDraftOnlyActions,
  buildWeeklyReviewDraft,
  DEFAULT_REVIEW_PROFILE,
} from "@my-brain/core";

export interface MemoryReviewDraftState {
  weeklyDraft: WeeklyReviewDraft;
  draftActions: ReviewDraftAction[];
}

export function buildMemoryReviewDraftState(input: {
  snapshot: GraphSnapshot;
  profile: UserModeProfile | null;
  history: GraphChangeRecord[];
}): MemoryReviewDraftState {
  const profile = input.profile ?? DEFAULT_REVIEW_PROFILE;

  return {
    weeklyDraft: buildWeeklyReviewDraft(input.snapshot, profile, input.history),
    draftActions: buildDraftOnlyActions(input.snapshot, profile),
  };
}
