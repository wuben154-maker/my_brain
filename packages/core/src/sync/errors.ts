export interface SyncStructuredError {
  error_class: string;
  root_cause_hint: string;
  hint_code: string;
  safe_retry: string;
  stop_condition: string;
}

export class SyncConflictError extends Error implements SyncStructuredError {
  readonly error_class = "SyncConflictError";
  readonly hint_code: string;
  readonly root_cause_hint: string;
  readonly safe_retry =
    "Choose a conflict resolution strategy in ProfileReview or sync UI, then replay merge once.";
  readonly stop_condition =
    "After 3 unresolved attempts for the same conflict_id, stop sync and export local backup.";
  readonly conflictId: string;
  readonly field: string;
  readonly attempt: number;

  constructor(input: {
    conflictId: string;
    field: string;
    message: string;
    hintCode?: string;
    attempt?: number;
  }) {
    super(input.message);
    this.name = "SyncConflictError";
    this.conflictId = input.conflictId;
    this.field = input.field;
    this.attempt = input.attempt ?? 1;
    this.hint_code = input.hintCode ?? `conflict:${input.field}`;
    this.root_cause_hint = input.message;
  }
}

export class SyncIngestGateViolation extends Error implements SyncStructuredError {
  readonly error_class = "IngestGateViolation";
  readonly hint_code = "ingest_gate:no_confirmed_flag";
  readonly root_cause_hint =
    "Remote sync payload attempted to apply permanent graph nodes without user-confirmed ingest metadata.";
  readonly safe_retry =
    "Route unconfirmed nodes to provisional queue, then confirm ingest per item in the app.";
  readonly stop_condition =
    "Batch ingest gate violations above threshold must pause sync and keep local DB readable.";
  readonly nodeIds: readonly string[];

  constructor(nodeIds: readonly string[]) {
    super(`Sync ingest gate violation for nodes: ${nodeIds.join(", ")}`);
    this.name = "SyncIngestGateViolation";
    this.nodeIds = nodeIds;
  }
}

export class SyncMergeTransactionError extends Error implements SyncStructuredError {
  readonly error_class = "MergeTransactionError";
  readonly hint_code: string;
  readonly root_cause_hint: string;
  readonly safe_retry = "Retry sync merge after a short cooldown without skipping validation.";
  readonly stop_condition =
    "If rollback fails or the same transaction error repeats 3 times, stop and export local backup.";

  constructor(hintCode: string, message: string) {
    super(message);
    this.name = "SyncMergeTransactionError";
    this.hint_code = hintCode;
    this.root_cause_hint = message;
  }
}

export function isSyncStructuredError(error: unknown): error is SyncStructuredError {
  return (
    typeof error === "object" &&
    error !== null &&
    "error_class" in error &&
    "root_cause_hint" in error &&
    "safe_retry" in error &&
    "stop_condition" in error
  );
}
