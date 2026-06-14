import { describe, expect, it } from "vitest";

import {
  buildM2IosBackupDeviceEvidenceArtifact,
  validateM2IosBackupDeviceEvidenceArtifact,
  type M2IosBackupDeviceEvidenceArtifact,
} from "./iosBackupEvidence";
import type { BackupExclusionFileEntry } from "../storage/iosBackupExclusion";

const checkedAt = "2026-06-14T08:00:00.000Z";

function sampleFiles(
  overrides: Partial<Record<".db" | "-wal" | "-shm", Partial<BackupExclusionFileEntry>>> = {},
): BackupExclusionFileEntry[] {
  const base = "/var/mobile/Containers/Data/Application/ABC/Documents/SQLite/mybrain.db";
  const defaults: BackupExclusionFileEntry[] = [
    {
      path: base,
      exists: true,
      excludedFromBackup: true,
      checkedAt,
      platform: "ios",
    },
    {
      path: `${base}-wal`,
      exists: true,
      excludedFromBackup: true,
      checkedAt,
      platform: "ios",
    },
    {
      path: `${base}-shm`,
      exists: true,
      excludedFromBackup: true,
      checkedAt,
      platform: "ios",
    },
  ];
  return defaults.map((entry) => {
    const suffix = entry.path.endsWith("-wal")
      ? "-wal"
      : entry.path.endsWith("-shm")
        ? "-shm"
        : ".db";
    return { ...entry, ...overrides[suffix] };
  });
}

describe("M2 iOS backup device evidence artifact", () => {
  it("accepts a fully valid present artifact", () => {
    const artifact: M2IosBackupDeviceEvidenceArtifact = {
      artifactType: "m2-ios-backup-exclusion-device-evidence",
      deviceEvidence: "present",
      platform: "ios",
      checkedAt,
      dbBasePath: "/var/mobile/Containers/Data/Application/ABC/Documents/SQLite/mybrain.db",
      files: sampleFiles(),
      collector: "settings-dev-trigger",
    };
    expect(validateM2IosBackupDeviceEvidenceArtifact(artifact)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects missing wal exclusion", () => {
    const artifact = {
      artifactType: "m2-ios-backup-exclusion-device-evidence",
      deviceEvidence: "present",
      platform: "ios",
      checkedAt,
      dbBasePath: "/tmp/mybrain.db",
      files: sampleFiles({ "-wal": { excludedFromBackup: false } }),
      collector: "settings-dev-trigger",
    };
    const result = validateM2IosBackupDeviceEvidenceArtifact(artifact);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("-wal"))).toBe(true);
  });

  it("marks artifact absent when device report fails validation", () => {
    const artifact = buildM2IosBackupDeviceEvidenceArtifact({
      dbPath: "/tmp/mybrain.db",
      files: sampleFiles({ "-shm": { exists: false } }),
    });
    expect(artifact.deviceEvidence).toBe("absent");
    expect(artifact.notes).toMatch(/validation failed/);
  });
});
