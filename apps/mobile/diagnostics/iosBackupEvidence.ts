import type { BackupExclusionFileEntry } from "../storage/iosBackupExclusion";

export const M2_IOS_BACKUP_EVIDENCE_ARTIFACT_REL =
  "specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json";

export type M2IosBackupDeviceEvidenceStatus = "present" | "absent";

export type M2IosBackupDeviceEvidenceArtifact = {
  artifactType: "m2-ios-backup-exclusion-device-evidence";
  deviceEvidence: M2IosBackupDeviceEvidenceStatus;
  platform: "ios";
  checkedAt: string;
  dbBasePath: string;
  files: BackupExclusionFileEntry[];
  collector: "settings-dev-trigger";
  notes?: string;
};

export type M2IosBackupEvidenceValidation = {
  ok: boolean;
  errors: string[];
};

function entryEndsWith(path: string, suffix: string): boolean {
  return path.endsWith(suffix);
}

/** Gate verifier: all three SQLite files must exist and be excluded from backup. */
export function validateM2IosBackupDeviceEvidenceArtifact(
  data: unknown,
): M2IosBackupEvidenceValidation {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["artifact must be a JSON object"] };
  }

  const artifact = data as Partial<M2IosBackupDeviceEvidenceArtifact>;

  if (artifact.deviceEvidence !== "present") {
    errors.push('deviceEvidence must be "present"');
  }
  if (artifact.platform !== "ios") {
    errors.push('platform must be "ios"');
  }
  if (!artifact.checkedAt || typeof artifact.checkedAt !== "string") {
    errors.push("checkedAt must be a non-empty ISO timestamp");
  }
  if (!Array.isArray(artifact.files) || artifact.files.length === 0) {
    errors.push("files must be a non-empty array");
    return { ok: false, errors };
  }

  const requiredSuffixes = [".db", "-wal", "-shm"] as const;
  for (const suffix of requiredSuffixes) {
    const match = artifact.files.find(
      (file) =>
        typeof file?.path === "string" && entryEndsWith(file.path, suffix),
    );
    if (!match) {
      errors.push(`missing file entry ending with ${suffix}`);
      continue;
    }
    if (match.exists !== true) {
      errors.push(`${suffix} file must exist on device (exists: false)`);
    }
    if (match.excludedFromBackup !== true) {
      errors.push(`${suffix} excludedFromBackup must be true`);
    }
    if (match.platform !== "ios") {
      errors.push(`${suffix} entry platform must be ios`);
    }
    if (!match.checkedAt) {
      errors.push(`${suffix} entry checkedAt required`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function buildM2IosBackupDeviceEvidenceArtifact(input: {
  dbPath: string;
  files: BackupExclusionFileEntry[];
}): M2IosBackupDeviceEvidenceArtifact {
  const checkedAt = input.files[0]?.checkedAt ?? new Date().toISOString();
  const draft: M2IosBackupDeviceEvidenceArtifact = {
    artifactType: "m2-ios-backup-exclusion-device-evidence",
    deviceEvidence: "present",
    platform: "ios",
    checkedAt,
    dbBasePath: input.dbPath,
    files: input.files,
    collector: "settings-dev-trigger",
  };
  const validation = validateM2IosBackupDeviceEvidenceArtifact(draft);
  if (!validation.ok) {
    return {
      ...draft,
      deviceEvidence: "absent",
      notes: `validation failed on device: ${validation.errors.join("; ")}`,
    };
  }
  return draft;
}

export function formatM2IosBackupDeviceEvidenceArtifact(
  artifact: M2IosBackupDeviceEvidenceArtifact,
): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
