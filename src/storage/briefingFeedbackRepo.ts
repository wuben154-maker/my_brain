import type {
  BriefingFeedback,
  BriefingFeedbackKind,
} from "@/domain/radar/briefingItem";

const BRIEFING_FEEDBACK_KINDS = [
  "not_interested",
  "too_shallow",
  "too_deep",
  "already_know",
] as const satisfies readonly BriefingFeedbackKind[];

export class InvalidBriefingFeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBriefingFeedbackError";
  }
}

function isBriefingFeedbackKind(value: string): value is BriefingFeedbackKind {
  return (BRIEFING_FEEDBACK_KINDS as readonly string[]).includes(value);
}

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) {
    throw new InvalidBriefingFeedbackError(
      `Invalid briefing feedback: ${field} is required`,
    );
  }
}

export function createBriefingFeedbackId(feedback: BriefingFeedback): string {
  return `${feedback.worldItemId}:${feedback.at}:${feedback.kind}`;
}

/** Normalize and validate before persisting. */
export function validateBriefingFeedback(
  feedback: BriefingFeedback,
): BriefingFeedback {
  assertNonEmpty(feedback.worldItemId, "worldItemId");
  assertNonEmpty(feedback.at, "at");
  if (!isBriefingFeedbackKind(feedback.kind)) {
    throw new InvalidBriefingFeedbackError(
      `Invalid briefing feedback kind: ${String(feedback.kind)}`,
    );
  }
  if (!Number.isFinite(Date.parse(feedback.at))) {
    throw new InvalidBriefingFeedbackError(
      "Invalid briefing feedback: at must be ISO8601",
    );
  }
  return {
    kind: feedback.kind,
    worldItemId: feedback.worldItemId.trim(),
    at: new Date(Date.parse(feedback.at)).toISOString(),
  };
}

export interface StoredBriefingFeedbackRow {
  id: string;
  world_item_id: string;
  kind: BriefingFeedbackKind;
  at: string;
}

export const LIST_BRIEFING_FEEDBACK_SQL = `
SELECT id, world_item_id, kind, at
FROM briefing_feedback
ORDER BY at ASC`.trim();

export function briefingFeedbackToStoredRow(
  feedback: BriefingFeedback,
): StoredBriefingFeedbackRow {
  const normalized = validateBriefingFeedback(feedback);
  return {
    id: createBriefingFeedbackId(normalized),
    world_item_id: normalized.worldItemId,
    kind: normalized.kind,
    at: normalized.at,
  };
}

export function storedRowToBriefingFeedback(
  row: StoredBriefingFeedbackRow,
): BriefingFeedback {
  const feedback: BriefingFeedback = {
    kind: row.kind,
    worldItemId: row.world_item_id,
    at: row.at,
  };
  validateBriefingFeedback(feedback);
  if (row.id !== createBriefingFeedbackId(feedback)) {
    throw new InvalidBriefingFeedbackError(
      "Stored briefing feedback id does not match payload",
    );
  }
  return feedback;
}

export function mapStoredBriefingFeedbackRows(
  rows: StoredBriefingFeedbackRow[],
): BriefingFeedback[] {
  return rows.map(storedRowToBriefingFeedback);
}

export function groupBriefingFeedbackByItemId(
  feedback: BriefingFeedback[],
): Record<string, BriefingFeedback[]> {
  const grouped: Record<string, BriefingFeedback[]> = {};
  for (const entry of feedback) {
    const bucket = grouped[entry.worldItemId] ?? [];
    bucket.push(entry);
    grouped[entry.worldItemId] = bucket;
  }
  return grouped;
}
