import type { ProfileCorrectionState } from "../profile/correctionHistory.js";
import type { MobileStorage } from "../storage/mobileStorage.js";
import { IngestGateViolation, MergeTransactionError } from "./errors.js";
import { assertBackupPayloadEntities } from "./manifest.js";
import type { BackupImportOptions, BackupSnapshotPayload } from "./types.js";

function assertGraphIngestGate(snapshot: BackupSnapshotPayload): void {
  for (const node of snapshot.graph_snapshot.nodes) {
    if (node.archived) {
      continue;
    }
    if (!node.confirmedAt && !node.ingestSource) {
      throw new IngestGateViolation(
        `Graph node ${node.id} missing confirmedAt/ingestSource ingest gate metadata`,
      );
    }
  }
}

function correctionStateFromPayload(
  payload: BackupSnapshotPayload,
): ProfileCorrectionState {
  return {
    traits: payload.profile_traits,
    corrections: payload.profile_correction_history,
    suppressionList: payload.profile_suppression_list,
  };
}

export function backupPayloadToPersistedBundle(payload: BackupSnapshotPayload) {
  return {
    profile: payload.user_mode_profile.profile,
    coldStartComplete: payload.user_mode_profile.coldStartComplete,
    correctionState: correctionStateFromPayload(payload),
    graph: payload.graph_snapshot,
    history: payload.graph_history,
    provisional: payload.provisional_queue,
    pendingIngest: null,
    signals: payload.adaptive_radar_state.signals,
    learningTraces: payload.learning_trace,
    worldItems: payload.world_items,
    providerConfig: {
      llm: "mock" as const,
      radar: "fixture" as const,
      voice: "disconnected" as const,
      storage: "ready" as const,
    },
    radarCursor: payload.adaptive_radar_state.cursor ?? null,
  };
}

export function validateBackupImport(
  payload: BackupSnapshotPayload,
  options: BackupImportOptions = {},
): void {
  assertBackupPayloadEntities(payload);
  if (payload.manifest.sensitive_profile_opt_in && !options.allowSensitiveProfile) {
    throw new MergeTransactionError(
      "trust:sensitive_profile_opt_in",
      "Backup includes sensitive profile prose but import did not opt in.",
    );
  }
  assertGraphIngestGate(payload);
}

/**
 * Atomic restore — all M7A entities commit in one transaction or none are written.
 */
export function importBackupSnapshot(
  storage: MobileStorage,
  payload: BackupSnapshotPayload,
  options: BackupImportOptions = {},
): void {
  validateBackupImport(payload, options);
  const bundle = backupPayloadToPersistedBundle(payload);

  try {
    storage.restoreBackupBundle(bundle);
  } catch (error) {
    throw new MergeTransactionError(
      "transaction:backup_restore_failed",
      error instanceof Error ? error.message : "backup restore transaction failed",
    );
  }
}
