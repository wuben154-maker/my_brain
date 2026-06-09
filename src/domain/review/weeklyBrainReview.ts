/** KOS-D3 — weekly brain review structured output (read-only + suggest). */

export type WeeklyBrainReviewSectionKind =
  | "graph_changes"
  | "new_concepts"
  | "merged_archived"
  | "learning_activity"
  | "weak_spots"
  | "next_steps";

export type WeeklyBrainReviewCitationType = "node" | "historyEntry" | "trace";

export interface WeeklyBrainReviewCitation {
  type: WeeklyBrainReviewCitationType;
  id: string;
  label: string;
}

export interface WeeklyBrainReviewSection {
  kind: WeeklyBrainReviewSectionKind;
  title: string;
  body: string;
  /** Citation keys `${type}:${id}` for chips tied to this section. */
  citationKeys: string[];
}

export interface WeeklyBrainReview {
  weekId: string;
  generatedAt: string;
  markdown: string;
  sections: WeeklyBrainReviewSection[];
  citations: WeeklyBrainReviewCitation[];
}

export interface WeekRange {
  weekId: string;
  /** ISO8601 inclusive start (Monday 00:00:00.000Z). */
  start: string;
  /** ISO8601 inclusive end (Sunday 23:59:59.999Z). */
  end: string;
}

export function citationKey(
  type: WeeklyBrainReviewCitationType,
  id: string,
): string {
  return `${type}:${id}`;
}

/** ISO week id e.g. `2026-W22` from an ISO timestamp. */
export function getIsoWeekId(isoDate: string): string {
  const date = new Date(isoDate);
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function parseIsoWeekId(weekId: string): { year: number; week: number } {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) {
    throw new Error(`Invalid ISO week id: ${weekId}`);
  }
  return { year: Number(match[1]), week: Number(match[2]) };
}

/** Monday-based ISO week range for a given week id. */
export function weekRangeForIsoWeek(weekId: string): WeekRange {
  const { year, week } = parseIsoWeekId(weekId);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const monday = new Date(mondayWeek1);
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    weekId,
    start: monday.toISOString(),
    end: sunday.toISOString(),
  };
}

export function isTimestampInWeekRange(at: string, range: WeekRange): boolean {
  const ms = Date.parse(at);
  const startMs = Date.parse(range.start);
  const endMs = Date.parse(range.end);
  if (!Number.isFinite(ms) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }
  return ms >= startMs && ms <= endMs;
}
