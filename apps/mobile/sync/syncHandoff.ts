import {
  bundleToSyncPayload,
  importBackupSnapshot,
  mergeSyncPayloads,
  parseBackupSnapshot,
  type BackupSnapshotPayload,
  type SyncMergeOptions,
  type SyncPayload,
} from "@my-brain/core";

import type { StorageSession } from "../storage/storageSession";

export type SyncHandoffResult =
  | { ok: true; provisionalRouted: number; archivedNodeIds: number }
  | { ok: false; reason: string; hintCode?: string; errorClass?: string };

export function parseSyncPayload(json: unknown): SyncPayload {
  if (typeof json !== "object" || json === null) {
    throw new Error("Sync payload must be a JSON object");
  }
  return json as SyncPayload;
}

export function exportSyncPayloadJson(session: StorageSession, deviceId: string): string {
  return JSON.stringify(exportSessionAsSyncPayload(session, deviceId), null, 2);
}

function syncPayloadToBackupPayload(merged: SyncPayload): BackupSnapshotPayload {
  return {
    manifest: {
      backup_manifest_version: merged.sync_manifest.sync_manifest_version,
      included_entities: merged.sync_manifest.included_entities,
      exported_at: merged.sync_manifest.exported_at,
      schema_version: merged.sync_manifest.schema_version,
      sensitive_profile_opt_in: merged.sync_manifest.sensitive_profile_opt_in,
    },
    graph_snapshot: merged.graph_snapshot,
    graph_history: merged.graph_history,
    user_mode_profile: merged.user_mode_profile,
    profile_correction_history: merged.profile_correction_history,
    profile_suppression_list: merged.profile_suppression_list,
    profile_traits: merged.profile_traits,
    learning_trace: merged.learning_trace,
    provisional_queue: merged.provisional_queue,
    world_items: merged.world_items,
    adaptive_radar_state: merged.adaptive_radar_state,
  };
}

function applyMergedSyncToSession(session: StorageSession, merged: SyncPayload): SyncHandoffResult {
  const restorePayload = syncPayloadToBackupPayload(merged);
  importBackupSnapshot(session.storage, restorePayload);
  return {
    ok: true,
    provisionalRouted: merged.provisional_queue.length,
    archivedNodeIds: merged.graph_snapshot.nodes.filter((n) => n.archived).length,
  };
}

export function mergeRemoteSyncPayloadIntoSession(
  session: StorageSession,
  remoteSyncJson: string,
  localDeviceId = "device-local",
  options: SyncMergeOptions = {},
): SyncHandoffResult {
  try {
    const remotePayload = parseSyncPayload(JSON.parse(remoteSyncJson));
    const localBundle = session.storage.hydrateBundle();
    const localPayload = bundleToSyncPayload(localBundle, localDeviceId);
    const { merged } = mergeSyncPayloads(localPayload, remotePayload, options);
    return applyMergedSyncToSession(session, merged);
  } catch (error) {
    return formatSyncHandoffError(error);
  }
}

function formatSyncHandoffError(error: unknown): SyncHandoffResult {
  const hintCode =
    typeof error === "object" &&
    error !== null &&
    "hint_code" in error &&
    typeof (error as { hint_code?: unknown }).hint_code === "string"
      ? (error as { hint_code: string }).hint_code
      : undefined;
  const errorClass =
    typeof error === "object" &&
    error !== null &&
    "error_class" in error &&
    typeof (error as { error_class?: unknown }).error_class === "string"
      ? (error as { error_class: string }).error_class
      : undefined;
  return {
    ok: false,
    reason: error instanceof Error ? error.message : "sync merge failed",
    hintCode,
    errorClass,
  };
}

export function mergeRemoteSyncIntoSession(
  session: StorageSession,
  remoteBackupJson: string,
  remoteDeviceId: string,
  localDeviceId = "device-local",
  options: SyncMergeOptions = {},
): SyncHandoffResult {
  try {
    const remoteBackup = parseBackupSnapshot(JSON.parse(remoteBackupJson)) as BackupSnapshotPayload;
    const remotePayload: SyncPayload = {
      ...remoteBackup,
      sync_manifest: {
        sync_manifest_version: 1,
        included_entities: remoteBackup.manifest.included_entities,
        exported_at: remoteBackup.manifest.exported_at,
        schema_version: remoteBackup.manifest.schema_version,
        device_id: remoteDeviceId,
        sensitive_profile_opt_in: remoteBackup.manifest.sensitive_profile_opt_in,
      },
    };

    const localBundle = session.storage.hydrateBundle();
    const localPayload = bundleToSyncPayload(localBundle, localDeviceId);
    const { merged } = mergeSyncPayloads(localPayload, remotePayload, options);
    return applyMergedSyncToSession(session, merged);
  } catch (error) {
    return formatSyncHandoffError(error);
  }
}

export function exportSessionAsSyncPayload(session: StorageSession, deviceId = "device-local") {
  const bundle = session.storage.hydrateBundle();
  return bundleToSyncPayload(bundle, deviceId);
}
