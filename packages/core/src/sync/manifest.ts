import { ManifestEntityMissing } from "../backup/errors.js";
import { BACKUP_REQUIRED_ENTITIES } from "../backup/types.js";
import { STORAGE_SCHEMA_VERSION } from "../storage/schema.js";
import type { SyncEntityId, SyncManifest, SyncPayload } from "./types.js";

const ENTITY_PAYLOAD_KEYS: Record<SyncEntityId, keyof SyncPayload> = {
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

export function buildSyncManifest(input: {
  exportedAt: string;
  deviceId: string;
  sensitiveProfileOptIn?: boolean;
}): SyncManifest {
  return {
    sync_manifest_version: 1,
    included_entities: [...BACKUP_REQUIRED_ENTITIES],
    exported_at: input.exportedAt,
    schema_version: STORAGE_SCHEMA_VERSION,
    device_id: input.deviceId,
    sensitive_profile_opt_in: input.sensitiveProfileOptIn ?? false,
  };
}

export function validateSyncManifest(manifest: SyncManifest): void {
  const missing = BACKUP_REQUIRED_ENTITIES.filter(
    (entity) => !manifest.included_entities.includes(entity),
  );
  if (missing.length > 0) {
    throw new ManifestEntityMissing(missing);
  }
}

export function assertSyncPayloadEntities(payload: SyncPayload): void {
  validateSyncManifest(payload.sync_manifest);
  const missing: SyncEntityId[] = [];
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

export function listMissingSyncEntities(manifest: SyncManifest): SyncEntityId[] {
  return BACKUP_REQUIRED_ENTITIES.filter(
    (entity) => !manifest.included_entities.includes(entity),
  );
}
