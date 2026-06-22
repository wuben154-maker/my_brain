import { describe, expect, it } from "vitest";

import {
  BackupCryptoUnavailableError,
  BackupDecryptError,
  ImportSchemaMismatch,
  IngestGateViolation,
  MalformedBackupJsonError,
  ManifestEntityMissing,
  MergeTransactionError,
  isBackupStructuredError,
} from "./errors.js";

describe("backup mergeError matrix (M7 §6.1)", () => {
  it("ManifestEntityMissing exposes structured fields and missing entity list", () => {
    const error = new ManifestEntityMissing(["profile_traits", "learning_trace"]);
    expect(error.error_class).toBe("ManifestEntityMissing");
    expect(error.hint_code).toBe("missing_entity:profile_traits");
    expect(error.missingEntities).toEqual(["profile_traits", "learning_trace"]);
    expect(error.safe_retry).toMatch(/complete backup package/i);
    expect(error.stop_condition).toMatch(/partial imports/i);
    expect(isBackupStructuredError(error)).toBe(true);
  });

  it("ImportSchemaMismatch captures manifest version mismatch", () => {
    const error = new ImportSchemaMismatch(1, 99);
    expect(error.error_class).toBe("ImportSchemaMismatch");
    expect(error.hint_code).toBe("schema:expected=1 got=99");
    expect(error.stop_condition).toMatch(/downgrade-write/i);
  });

  it("BackupDecryptError uses crypto hint_code and retry stop condition", () => {
    const error = new BackupDecryptError();
    expect(error.error_class).toBe("BackupDecryptError");
    expect(error.hint_code).toBe("crypto:wrong_passphrase");
    expect(error.stop_condition).toMatch(/3 failed decrypt attempts/i);
  });

  it("BackupCryptoUnavailableError blocks encrypted path until adapter is ready", () => {
    const error = new BackupCryptoUnavailableError("RN crypto adapter PENDING_DEVICE");
    expect(error.error_class).toBe("BackupCryptoUnavailableError");
    expect(error.hint_code).toBe("crypto:adapter_unavailable");
    expect(error.root_cause_hint).toContain("PENDING_DEVICE");
    expect(error.stop_condition).toMatch(/until crypto port reports available/i);
  });

  it("MergeTransactionError supports transaction stop condition after repeated failures", () => {
    const error = new MergeTransactionError(
      "transaction:backup_restore_failed",
      "Graph history co-write failed during backup restore",
    );
    expect(error.error_class).toBe("MergeTransactionError");
    expect(error.hint_code).toBe("transaction:backup_restore_failed");
    expect(error.safe_retry).toMatch(/cooldown/i);
    expect(error.stop_condition).toMatch(/3 times/);
  });

  it("IngestGateViolation preserves ingest_gate hint_code and provisional retry guidance", () => {
    const error = new IngestGateViolation("node-x missing ingest metadata");
    expect(error.error_class).toBe("IngestGateViolation");
    expect(error.hint_code).toBe("ingest_gate:no_confirmed_flag");
    expect(error.safe_retry).toMatch(/provisional candidates only/i);
    expect(error.stop_condition).toMatch(/pause import/i);
  });

  it("MalformedBackupJsonError exposes import hint_code for paste/file failures", () => {
    const error = new MalformedBackupJsonError("Backup JSON parse failed: Unexpected token");
    expect(error.error_class).toBe("MalformedBackupJsonError");
    expect(error.hint_code).toBe("import:malformed_json");
    expect(error.safe_retry).toMatch(/paste or pick/i);
    expect(isBackupStructuredError(error)).toBe(true);
  });
});
