import type { UserModeProfile } from "../domain/userMode.js";
import {
  applyProfileCorrection,
  type CorrectionRecord,
  type ProfileCorrectionState,
  type ProfileTrait,
} from "../profile/correctionHistory.js";
import { SyncConflictError } from "./errors.js";
import type { ProfileConflictResolution } from "./types.js";

const MANUAL_ACTIONS = new Set<CorrectionRecord["action"]>([
  "suppress",
  "restore",
  "manual_override",
]);

function isManualCorrection(record: CorrectionRecord): boolean {
  return MANUAL_ACTIONS.has(record.action);
}

function latestManualCorrection(
  corrections: CorrectionRecord[],
  traitId: string,
): CorrectionRecord | undefined {
  return [...corrections]
    .filter((c) => c.traitId === traitId && isManualCorrection(c))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

function traitSourceRank(source: ProfileTrait["source"]): number {
  if (source === "manual") {
    return 3;
  }
  if (source === "behavior") {
    return 2;
  }
  return 1;
}

export function detectProfileConflicts(
  local: ProfileCorrectionState,
  remote: ProfileCorrectionState,
): string[] {
  const conflicts: string[] = [];
  const traitIds = new Set([
    ...local.traits.map((t) => t.id),
    ...remote.traits.map((t) => t.id),
  ]);

  for (const traitId of traitIds) {
    const localManual = latestManualCorrection(local.corrections, traitId);
    const remoteManual = latestManualCorrection(remote.corrections, traitId);
    if (localManual && remoteManual) {
      if (
        localManual.action !== remoteManual.action ||
        localManual.note !== remoteManual.note
      ) {
        conflicts.push(traitId);
      }
    }
  }
  return conflicts;
}

/**
 * Trust priority: manual correction/suppression > behavior > LLM.
 * Never silently overwrite local manual corrections with remote LLM/behavior.
 */
export function mergeProfileCorrectionState(input: {
  local: ProfileCorrectionState;
  remote: ProfileCorrectionState;
  resolution?: ProfileConflictResolution;
  conflictId?: string;
  conflictAttempt?: number;
}): ProfileCorrectionState {
  const conflicts = detectProfileConflicts(input.local, input.remote);
  if (conflicts.length > 0 && !input.resolution) {
    const attempt = input.conflictAttempt ?? 1;
    if (attempt >= 3) {
      throw new SyncConflictError({
        conflictId: input.conflictId ?? `profile-${conflicts[0]}`,
        field: conflicts[0] ?? "profile",
        message: `Profile sync conflict unresolved after ${attempt} attempts for traits: ${conflicts.join(", ")}`,
        hintCode: `conflict:profile_field:${conflicts[0]}`,
        attempt,
      });
    }
    throw new SyncConflictError({
      conflictId: input.conflictId ?? `profile-${conflicts[0]}`,
      field: conflicts[0] ?? "profile",
      message: `Dual manual profile corrections conflict on: ${conflicts.join(", ")}`,
      hintCode: `conflict:profile_field:${conflicts[0]}`,
      attempt,
    });
  }

  if (input.resolution?.strategy === "keep_local") {
    return input.local;
  }
  if (input.resolution?.strategy === "keep_remote") {
    return input.remote;
  }

  const traitById = new Map<string, ProfileTrait>();
  for (const trait of [...input.remote.traits, ...input.local.traits]) {
    const existing = traitById.get(trait.id);
    if (!existing) {
      traitById.set(trait.id, trait);
      continue;
    }
    const localManual = latestManualCorrection(input.local.corrections, trait.id);
    const remoteManual = latestManualCorrection(input.remote.corrections, trait.id);
    if (localManual && !remoteManual) {
      traitById.set(trait.id, { ...existing, ...input.local.traits.find((t) => t.id === trait.id)! });
      continue;
    }
    if (remoteManual && !localManual) {
      traitById.set(trait.id, trait);
      continue;
    }
    const winner =
      traitSourceRank(existing.source) >= traitSourceRank(trait.source) ? existing : trait;
    traitById.set(trait.id, winner);
  }

  const suppressionList = [
    ...new Set([...input.local.suppressionList, ...input.remote.suppressionList]),
  ];

  const correctionByKey = new Map<string, CorrectionRecord>();
  for (const record of [...input.remote.corrections, ...input.local.corrections]) {
    const key = `${record.traitId}:${record.at}:${record.action}`;
    correctionByKey.set(key, record);
  }

  let merged: ProfileCorrectionState = {
    traits: [...traitById.values()],
    corrections: [...correctionByKey.values()].sort((a, b) => a.at.localeCompare(b.at)),
    suppressionList,
  };

  for (const traitId of suppressionList) {
    if (!merged.traits.some((t) => t.id === traitId)) {
      merged = applyProfileCorrection(merged, traitId, "suppress", "sync suppression union");
    }
  }

  return merged;
}

export function mergeUserModeProfile(
  local: UserModeProfile | null,
  remote: UserModeProfile | null,
  correction: ProfileCorrectionState,
): UserModeProfile | null {
  if (!local && !remote) {
    return null;
  }
  const base = local ?? remote!;
  const localManual = correction.corrections.some((c) => isManualCorrection(c));
  if (localManual && local?.lastCorrectionAt && remote?.lastCorrectionAt) {
    if (local.lastCorrectionAt >= remote.lastCorrectionAt) {
      return local;
    }
  }
  return {
    ...(remote ?? base),
    ...base,
    lastCorrectionAt: local?.lastCorrectionAt ?? remote?.lastCorrectionAt,
  };
}

export function remoteWouldSilentlyOverwriteManual(
  local: ProfileCorrectionState,
  remote: ProfileCorrectionState,
): boolean {
  for (const trait of local.traits) {
    if (trait.source !== "manual") {
      continue;
    }
    const remoteTrait = remote.traits.find((t) => t.id === trait.id);
    if (!remoteTrait) {
      continue;
    }
    if (remoteTrait.source === "llm" && remoteTrait.label !== trait.label) {
      return true;
    }
  }
  return false;
}
