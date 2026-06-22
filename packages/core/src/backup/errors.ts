export interface BackupStructuredError {
  error_class: string;
  root_cause_hint: string;
  hint_code: string;
  safe_retry: string;
  stop_condition: string;
}

export class ManifestEntityMissing extends Error implements BackupStructuredError {
  readonly error_class = "ManifestEntityMissing";
  readonly hint_code: string;
  readonly root_cause_hint: string;
  readonly safe_retry =
    "Provide a complete backup package that includes every required entity.";
  readonly stop_condition =
    "Do not retry partial imports; request a full export from the source device.";
  readonly missingEntities: readonly string[];

  constructor(missingEntities: readonly string[]) {
    const list = missingEntities.join(", ");
    super(`Backup manifest missing required entities: ${list}`);
    this.name = "ManifestEntityMissing";
    this.missingEntities = missingEntities;
    this.hint_code = `missing_entity:${missingEntities[0] ?? "unknown"}`;
    this.root_cause_hint = `Required backup entities are absent: ${list}.`;
  }
}

export class ImportSchemaMismatch extends Error implements BackupStructuredError {
  readonly error_class = "ImportSchemaMismatch";
  readonly hint_code: string;
  readonly root_cause_hint: string;
  readonly safe_retry =
    "Upgrade the app to a version that supports this backup schema, then retry import.";
  readonly stop_condition =
    "Do not downgrade-write the database when manifest or schema versions mismatch.";

  constructor(expected: number, got: number) {
    super(`Backup schema mismatch: expected manifest ${expected}, got ${got}`);
    this.name = "ImportSchemaMismatch";
    this.hint_code = `schema:expected=${expected} got=${got}`;
    this.root_cause_hint = `Backup manifest version ${got} is not supported (expected ${expected}).`;
  }
}

export class BackupCryptoUnavailableError extends Error implements BackupStructuredError {
  readonly error_class = "BackupCryptoUnavailableError";
  readonly hint_code = "crypto:adapter_unavailable";
  readonly root_cause_hint: string;
  readonly safe_retry =
    "Use plain JSON backup export, or retry after the RN crypto adapter is installed on device.";
  readonly stop_condition =
    "Do not retry encrypted backup on device until crypto port reports available.";

  constructor(message: string) {
    super(message);
    this.name = "BackupCryptoUnavailableError";
    this.root_cause_hint = message;
  }
}

export class BackupDecryptError extends Error implements BackupStructuredError {
  readonly error_class = "BackupDecryptError";
  readonly hint_code = "crypto:wrong_passphrase";
  readonly root_cause_hint =
    "Encrypted backup could not be decrypted with the supplied passphrase.";
  readonly safe_retry = "Re-enter the correct passphrase and retry once.";
  readonly stop_condition =
    "After 3 failed decrypt attempts, stop and export a fresh local backup.";

  constructor(message = "Encrypted backup decrypt failed") {
    super(message);
    this.name = "BackupDecryptError";
  }
}

export class MergeTransactionError extends Error implements BackupStructuredError {
  readonly error_class = "MergeTransactionError";
  readonly hint_code: string;
  readonly root_cause_hint: string;
  readonly safe_retry = "Retry the import after a short cooldown without skipping validation.";
  readonly stop_condition =
    "If rollback fails or the same transaction error repeats 3 times, stop and export local backup.";

  constructor(hintCode: string, message: string) {
    super(message);
    this.name = "MergeTransactionError";
    this.hint_code = hintCode;
    this.root_cause_hint = message;
  }
}

export class MalformedBackupJsonError extends Error implements BackupStructuredError {
  readonly error_class = "MalformedBackupJsonError";
  readonly hint_code = "import:malformed_json";
  readonly root_cause_hint: string;
  readonly safe_retry =
    "Paste or pick a complete mybrain-backup.json export; verify braces and quotes.";
  readonly stop_condition =
    "Do not retry import until the JSON parses cleanly in a validator.";

  constructor(message: string) {
    super(message);
    this.name = "MalformedBackupJsonError";
    this.root_cause_hint = message;
  }
}

export class IngestGateViolation extends Error implements BackupStructuredError {
  readonly error_class = "IngestGateViolation";
  readonly hint_code = "ingest_gate:no_confirmed_flag";
  readonly root_cause_hint =
    "Backup attempted to restore permanent graph nodes without user-confirmed ingest metadata.";
  readonly safe_retry =
    "Import provisional candidates only, then confirm ingest per item in the app.";
  readonly stop_condition =
    "Batch ingest gate violations above threshold must pause import and keep local DB readable.";

  constructor(message = "Ingest gate violation during backup import") {
    super(message);
    this.name = "IngestGateViolation";
  }
}

export function isBackupStructuredError(error: unknown): error is BackupStructuredError {
  return (
    typeof error === "object" &&
    error !== null &&
    "error_class" in error &&
    "root_cause_hint" in error &&
    "safe_retry" in error &&
    "stop_condition" in error
  );
}
