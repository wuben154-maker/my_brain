import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BackupDecryptError } from "../src/backup/errors.js";
import {
  decryptBackupSnapshot,
  encryptBackupSnapshot,
  parseEncryptedBackup,
  serializeEncryptedBackup,
} from "../src/backup/encryptedBackup.js";
import { exportBackupSnapshotFromStorage } from "../src/backup/exportBackup.js";
import { importBackupSnapshot } from "../src/backup/importBackup.js";
import { createPopulatedStorage, reopenStorage } from "../src/backup/testFixtures.js";

describe("encrypted-backup round-trip", () => {
  it("encrypts and decrypts backup payload with passphrase", () => {
    const fx = createPopulatedStorage();
    const payload = exportBackupSnapshotFromStorage(fx.storage);
    fx.cleanup();

    const envelope = encryptBackupSnapshot(payload, "user-passphrase-123");
    const decrypted = decryptBackupSnapshot(envelope, "user-passphrase-123");
    expect(decrypted.manifest.backup_manifest_version).toBe(payload.manifest.backup_manifest_version);
    expect(decrypted.profile_suppression_list).toEqual(payload.profile_suppression_list);
  });

  it("throws BackupDecryptError with safe_retry metadata on wrong passphrase", () => {
    const fx = createPopulatedStorage();
    const envelope = encryptBackupSnapshot(
      exportBackupSnapshotFromStorage(fx.storage),
      "correct",
    );
    fx.cleanup();

    expect(() => decryptBackupSnapshot(envelope, "wrong")).toThrow(BackupDecryptError);
    try {
      decryptBackupSnapshot(envelope, "wrong");
    } catch (error) {
      expect(error).toBeInstanceOf(BackupDecryptError);
      const typed = error as BackupDecryptError;
      expect(typed.hint_code).toBe("crypto:wrong_passphrase");
      expect(typed.safe_retry).toContain("passphrase");
      expect(typed.stop_condition).toContain("3");
    }
  });

  it("imports decrypted encrypted backup into fresh storage", () => {
    const fx = createPopulatedStorage();
    const envelope = encryptBackupSnapshot(
      exportBackupSnapshotFromStorage(fx.storage),
      "migrate-me",
    );
    fx.cleanup();

    const dir = mkdtempSync(join(tmpdir(), "mybrain-encrypted-"));
    const { storage, driver } = reopenStorage(join(dir, "enc.db"));
    importBackupSnapshot(storage, decryptBackupSnapshot(envelope, "migrate-me"));
    expect(storage.loadCorrectionState().suppressionList).toContain("mode-learner");
    driver.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("serializes encrypted envelope JSON for manual transport", () => {
    const fx = createPopulatedStorage();
    const envelope = encryptBackupSnapshot(
      exportBackupSnapshotFromStorage(fx.storage),
      "file-export",
    );
    fx.cleanup();
    const parsed = parseEncryptedBackup(JSON.parse(serializeEncryptedBackup(envelope)));
    expect(parsed.envelope_version).toBe(1);
    expect(parsed.ciphertext.length).toBeGreaterThan(20);
  });
});
