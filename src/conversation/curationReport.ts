import type { GraphHistoryEntry } from "@/domain/graphHistory";

export const CURATION_REPORT_MIN_INTERVAL_MS = 120_000;

export function shouldSpeakCurationReport(
  _entry: GraphHistoryEntry,
  lastSpokenAt: number,
  nowMs = Date.now(),
): boolean {
  return lastSpokenAt <= 0 || nowMs - lastSpokenAt >= CURATION_REPORT_MIN_INTERVAL_MS;
}

export function formatCurationReport(entry: GraphHistoryEntry): string {
  const detail = entry.reasonDetail.trim();
  if (detail) {
    return `${entry.summary}：${detail}`;
  }
  return entry.summary;
}
