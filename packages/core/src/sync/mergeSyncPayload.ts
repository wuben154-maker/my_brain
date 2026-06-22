import type { MobilePersistedBundle } from "../storage/mobileStorage.js";
import {
  collectRemoteDeleteIntents,
  mergeGraphHistory,
  mergeGraphSnapshots,
} from "./conflictMerge.js";
import { assertSyncPayloadEntities, buildSyncManifest } from "./manifest.js";
import {
  detectProfileConflicts,
  mergeProfileCorrectionState,
  mergeUserModeProfile,
  remoteWouldSilentlyOverwriteManual,
} from "./profileMerge.js";
import { assertMergedGraphIngestGate } from "./ingestGate.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import type { SyncMergeOptions, SyncMergeResult, SyncPayload } from "./types.js";
import { SyncMergeTransactionError } from "./errors.js";
import type { ProfileCorrectionState } from "../profile/correctionHistory.js";

function correctionStateFromPayload(payload: SyncPayload): ProfileCorrectionState {
  return {
    traits: payload.profile_traits,
    corrections: payload.profile_correction_history,
    suppressionList: payload.profile_suppression_list,
  };
}

export function bundleToSyncPayload(
  bundle: MobilePersistedBundle,
  deviceId: string,
): SyncPayload {
  const exportedAt = new Date().toISOString();
  const profileBackup = {
    profile: bundle.profile,
    coldStartComplete: bundle.coldStartComplete,
  };

  return {
    sync_manifest: buildSyncManifest({
      exportedAt,
      deviceId,
      sensitiveProfileOptIn: false,
    }),
    graph_snapshot: bundle.graph,
    graph_history: bundle.history,
    user_mode_profile: profileBackup,
    profile_correction_history: bundle.correctionState.corrections,
    profile_suppression_list: bundle.correctionState.suppressionList,
    profile_traits: bundle.correctionState.traits,
    learning_trace: bundle.learningTraces,
    provisional_queue: bundle.provisional,
    world_items: bundle.worldItems,
    adaptive_radar_state: {
      signals: bundle.signals,
      cursor: null,
    },
  };
}

export function mergeSyncPayloads(
  local: SyncPayload,
  remote: SyncPayload,
  options: SyncMergeOptions = {},
): SyncMergeResult {
  assertSyncPayloadEntities(local);
  assertSyncPayloadEntities(remote);

  const localCorrection = correctionStateFromPayload(local);
  const remoteCorrection = correctionStateFromPayload(remote);

  if (remoteWouldSilentlyOverwriteManual(localCorrection, remoteCorrection)) {
    throw new SyncMergeTransactionError(
      "trust:manual_overrides_llm",
      "Remote sync would silently overwrite local manual profile corrections.",
    );
  }

  const profileConflictsPending = options.profileConflict
    ? []
    : detectProfileConflicts(localCorrection, remoteCorrection);

  const mergedCorrection = mergeProfileCorrectionState({
    local: localCorrection,
    remote: remoteCorrection,
    resolution: options.profileConflict,
    conflictId: options.conflictId,
    conflictAttempt: options.conflictAttempt,
  });

  const remoteDeletes = collectRemoteDeleteIntents(remote.graph_history);
  const graphMerge = mergeGraphSnapshots({
    local: local.graph_snapshot,
    remote: remote.graph_snapshot,
    remoteDeviceId: remote.sync_manifest.device_id,
    remoteDeletedNodeIds: remoteDeletes,
    edgeMigrationHistory: mergeGraphHistory(local.graph_history, remote.graph_history),
  });

  assertMergedGraphIngestGate(graphMerge.merged);

  const mergedProvisional = dedupeProvisional([
    ...local.provisional_queue,
    ...remote.provisional_queue,
    ...graphMerge.provisionalFromRemote,
  ]);

  const mergedProfile = mergeUserModeProfile(
    local.user_mode_profile.profile,
    remote.user_mode_profile.profile,
    mergedCorrection,
  );

  const merged: SyncPayload = {
    sync_manifest: buildSyncManifest({
      exportedAt: new Date().toISOString(),
      deviceId: local.sync_manifest.device_id,
      sensitiveProfileOptIn:
        local.sync_manifest.sensitive_profile_opt_in ||
        remote.sync_manifest.sensitive_profile_opt_in,
    }),
    graph_snapshot: graphMerge.merged,
    graph_history: mergeGraphHistory(local.graph_history, remote.graph_history),
    user_mode_profile: {
      profile: mergedProfile,
      coldStartComplete:
        local.user_mode_profile.coldStartComplete ||
        remote.user_mode_profile.coldStartComplete,
    },
    profile_correction_history: mergedCorrection.corrections,
    profile_suppression_list: mergedCorrection.suppressionList,
    profile_traits: mergedCorrection.traits,
    learning_trace: dedupeById(local.learning_trace, remote.learning_trace),
    provisional_queue: mergedProvisional,
    world_items: dedupeById(local.world_items, remote.world_items),
    adaptive_radar_state: {
      signals:
        remote.adaptive_radar_state.signals.length >=
        local.adaptive_radar_state.signals.length
          ? remote.adaptive_radar_state.signals
          : local.adaptive_radar_state.signals,
      cursor: remote.adaptive_radar_state.cursor ?? local.adaptive_radar_state.cursor,
    },
  };

  return {
    merged,
    provisionalRouted: graphMerge.provisionalFromRemote.map((p) => p.id),
    archivedNodeIds: graphMerge.archivedNodeIds,
    profileConflictsPending,
  };
}

function dedupeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of [...local, ...remote]) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function dedupeProvisional(items: ProvisionalCandidate[]): ProvisionalCandidate[] {
  const map = new Map<string, ProvisionalCandidate>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return [...map.values()];
}
