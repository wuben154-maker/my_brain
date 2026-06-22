import { describe, expect, it } from "vitest";

import {
  BackupCryptoUnavailableError,
  BackupDecryptError,
  ImportSchemaMismatch,
  IngestGateViolation,
  ManifestEntityMissing,
  MergeTransactionError,
  isBackupStructuredError,
} from "../src/backup/errors.js";

/** Gate-path mirror of `src/backup/mergeError.test.ts` for stage-checks fixture paths. */
describe("backup mergeError matrix (M7 §6.1 gate path)", () => {
  it("ManifestEntityMissing exposes structured fields and missing entity list", () => {
    const error = new ManifestEntityMissing(["profile_traits", "learning_trace"]);
    expect(error.error_class).toBe("ManifestEntityMissing");
    expect(error.hint_code).toBe("missing_entity:profile_traits");
    expect(error.missingEntities).toEqual(["profile_traits", "learning_trace"]);
    expect(isBackupStructuredError(error)).toBe(true);
  });

  it("ImportSchemaMismatch captures manifest version mismatch", () => {
    const error = new ImportSchemaMismatch(1, 99);
    expect(error.hint_code).toBe("schema:expected=1 got=99");
  });

  it("BackupDecryptError uses crypto hint_code", () => {
    expect(new BackupDecryptError().hint_code).toBe("crypto:wrong_passphrase");
  });

  it("BackupCryptoUnavailableError blocks encrypted path until adapter is ready", () => {
    const error = new BackupCryptoUnavailableError("RN crypto adapter PENDING_DEVICE");
    expect(error.hint_code).toBe("crypto:adapter_unavailable");
  });

  it("MergeTransactionError supports transaction stop condition", () => {
    const error = new MergeTransactionError(
      "transaction:backup_restore_failed",
      "restore failed",
    );
    expect(error.stop_condition).toMatch(/3 times/);
  });

  it("IngestGateViolation preserves ingest_gate hint_code", () => {
    expect(new IngestGateViolation().hint_code).toBe("ingest_gate:no_confirmed_flag");
  });
});
