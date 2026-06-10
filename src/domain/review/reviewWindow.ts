import { getIsoWeekId, type WeekRange } from "@/domain/review/weeklyBrainReview";

const MS_PER_DAY = 86_400_000;

/** Rolling review window: since last review, capped at maxDays (default 7). */
export function computeReviewWindow(
  lastReviewAt: string | null,
  now: string,
  maxDays = 7,
): WeekRange {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) {
    throw new Error(`Invalid review clock: ${now}`);
  }
  const maxSpanMs = maxDays * MS_PER_DAY;
  const sinceMs = lastReviewAt ? Date.parse(lastReviewAt) : nowMs - maxSpanMs;
  const startMs = Math.max(
    Number.isFinite(sinceMs) ? sinceMs : nowMs - maxSpanMs,
    nowMs - maxSpanMs,
  );
  return {
    weekId: getIsoWeekId(now),
    start: new Date(startMs).toISOString(),
    end: new Date(nowMs).toISOString(),
  };
}
