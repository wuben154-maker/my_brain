import { ImportSchemaMismatch, ManifestEntityMissing } from "./errors.js";
import {
  BACKUP_MANIFEST_VERSION,
  BACKUP_REQUIRED_ENTITIES,
  type BackupEntityId,
  type BackupManifest,
  type BackupSnapshotPayload,
} from "./types.js";

const ENTITY_PAYLOAD_KEYS: Record<BackupEntityId, keyof BackupSnapshotPayload> = {
  graph_snapshot: "graph_snapshot",
  graph_history: "graph_history",
  user_mode_profile: "user_mode_profile",
  profile_correction_history: "profile_correction_history",
  profile_suppression_list: "profile_suppression_list",
  profile_traits: "profile_traits",
  learning_trace: "learning_trace",
  provisional_queue: "provisional_queue",
  world_items: "world_items",
  adaptive_radar_state: "adaptive_radar_state",
};

export function buildBackupManifest(input: {
  exportedAt: string;
  schemaVersion: number;
  sensitiveProfileOptIn?: boolean;
}): BackupManifest {
  return {
    backup_manifest_version: BACKUP_MANIFEST_VERSION,
    included_entities: [...BACKUP_REQUIRED_ENTITIES],
    exported_at: input.exportedAt,
    schema_version: input.schemaVersion,
    sensitive_profile_opt_in: input.sensitiveProfileOptIn ?? false,
  };
}

export function validateBackupManifest(manifest: BackupManifest): void {
  if (manifest.backup_manifest_version !== BACKUP_MANIFEST_VERSION) {
    throw new ImportSchemaMismatch(
      BACKUP_MANIFEST_VERSION,
      manifest.backup_manifest_version,
    );
  }

  const missing = BACKUP_REQUIRED_ENTITIES.filter(
    (entity) => !manifest.included_entities.includes(entity),
  );
  if (missing.length > 0) {
    throw new ManifestEntityMissing(missing);
  }
}

export function assertBackupPayloadEntities(payload: BackupSnapshotPayload): void {
  validateBackupManifest(payload.manifest);

  const missing: BackupEntityId[] = [];
  for (const entity of BACKUP_REQUIRED_ENTITIES) {
    const key = ENTITY_PAYLOAD_KEYS[entity];
    const value = payload[key];
    if (value === undefined || value === null) {
      missing.push(entity);
    }
  }
  if (missing.length > 0) {
    throw new ManifestEntityMissing(missing);
  }
}

export function listMissingManifestEntities(
  manifest: BackupManifest,
): BackupEntityId[] {
  return BACKUP_REQUIRED_ENTITIES.filter(
    (entity) => !manifest.included_entities.includes(entity),
  );
}
