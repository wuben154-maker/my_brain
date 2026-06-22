import type { ActionConfirmation, CognitiveActionType, CognitivePermissionLevel } from "./types.js";

export type ExecutionGateErrorCode =
  | "CONFIRMATION_REQUIRED"
  | "BYPASS_HARD_STOP"
  | "INVALID_CONFIRMATION";

export interface ExecutionGateInput {
  confirmation?: ActionConfirmation | null;
  /** Explicit bypass attempt — always HARD_STOP for remote writes. */
  bypassAttempt?: boolean;
}

export interface ExecutionGateResult {
  allowed: boolean;
  errorCode?: ExecutionGateErrorCode;
  hardStop?: boolean;
}

const REMOTE_WRITE_ACTION_TYPES = new Set<CognitiveActionType>([
  "draft_github_issue",
  "draft_blog_post",
]);

export function requiresRemoteWrite(actionType: CognitiveActionType): boolean {
  return REMOTE_WRITE_ACTION_TYPES.has(actionType);
}

export function permissionLevelForAction(
  actionType: CognitiveActionType,
): CognitivePermissionLevel {
  return requiresRemoteWrite(actionType) ? "user-confirmed-write" : "suggest";
}

function isNonEmptyIsoTimestamp(value: string | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function isValidConfirmationToken(token: string | undefined): boolean {
  return Boolean(token?.trim() && token.trim().length >= 8);
}

/** Gate for remote execute — HARD_STOP without confirmationToken + confirmedAt. */
export function assertExecutionAllowed(input: ExecutionGateInput): ExecutionGateResult {
  if (input.bypassAttempt) {
    return { allowed: false, errorCode: "BYPASS_HARD_STOP", hardStop: true };
  }

  const confirmation = input.confirmation;
  if (!confirmation) {
    return { allowed: false, errorCode: "CONFIRMATION_REQUIRED" };
  }

  if (!isValidConfirmationToken(confirmation.confirmationToken)) {
    return { allowed: false, errorCode: "INVALID_CONFIRMATION" };
  }

  if (!isNonEmptyIsoTimestamp(confirmation.confirmedAt)) {
    return { allowed: false, errorCode: "CONFIRMATION_REQUIRED" };
  }

  return { allowed: true };
}

export function createConfirmationToken(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `confirm-${Date.now()}-${suffix}`;
}
