import type { CurationAction, CurationActionKind } from "./types.js";

const VALID_KINDS: CurationActionKind[] = ["merge", "link", "archive"];

function isActionKind(value: unknown): value is CurationActionKind {
  return typeof value === "string" && (VALID_KINDS as string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNodeId(value: unknown): value is string | undefined {
  return value === undefined || isNonEmptyString(value);
}

function isLlmActionRecord(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!isActionKind(record.kind) || !isNonEmptyString(record.summary)) {
    return false;
  }

  switch (record.kind) {
    case "merge":
      return (
        isNonEmptyString(record.sourceNodeId) &&
        isNonEmptyString(record.targetNodeId) &&
        isNonEmptyString(record.mergedIntro)
      );
    case "link":
      return (
        isNonEmptyString(record.fromId) &&
        isNonEmptyString(record.toId) &&
        isNonEmptyString(record.relation)
      );
    case "archive":
      return (
        isNonEmptyString(record.nodeId) &&
        isOptionalNodeId(record.migrateEdgesToNodeId)
      );
    default:
      return false;
  }
}

export interface LlmCurationSuggestion {
  actions: CurationAction[];
}

export function validateLlmCurationSuggestion(
  value: unknown,
): value is LlmCurationSuggestion {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.actions)) {
    return false;
  }
  if (record.actions.length === 0) {
    return false;
  }
  return record.actions.every(isLlmActionRecord);
}

export function parseLlmCurationSuggestion(value: unknown): LlmCurationSuggestion | null {
  if (!validateLlmCurationSuggestion(value)) {
    return null;
  }
  return value;
}
