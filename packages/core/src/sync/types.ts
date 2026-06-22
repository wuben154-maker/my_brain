import type { BackupSnapshotPayload } from "../backup/types.js";
import { BACKUP_REQUIRED_ENTITIES } from "../backup/types.js";

export const SYNC_MANIFEST_VERSION = 1;

/** M7 §2.1.1 — sync payload entity set matches backup required entities. */
export const SYNC_REQUIRED_ENTITIES = BACKUP_REQUIRED_ENTITIES;

export type SyncEntityId = (typeof SYNC_REQUIRED_ENTITIES)[number];

export interface SyncManifest {
  sync_manifest_version: number;
  included_entities: SyncEntityId[];
  exported_at: string;
  schema_version: number;
  device_id: string;
  sensitive_profile_opt_in: boolean;
}

/** Full sync exchange payload — same entity coverage as M7A backup snapshot. */
export interface SyncPayload extends Omit<BackupSnapshotPayload, "manifest"> {
  sync_manifest: SyncManifest;
}

export interface SyncPullResult {
  payload: SyncPayload | null;
  resumeToken?: string;
}

export interface SyncPushResult {
  accepted: boolean;
  resumeToken?: string;
}

/** Pluggable sync transport — mock JSON/graph snapshot exchange for M7B. */
export interface SyncProvider {
  readonly deviceId: string;
  pull(resumeToken?: string): Promise<SyncPullResult>;
  push(payload: SyncPayload): Promise<SyncPushResult>;
}

export type ProfileConflictResolution =
  | { strategy: "keep_local" }
  | { strategy: "keep_remote" }
  | { strategy: "merge_manual_union" };

export interface SyncMergeOptions {
  profileConflict?: ProfileConflictResolution;
  /** Required when automatic profile merge detects dual manual override. */
  conflictId?: string;
  conflictAttempt?: number;
}

export interface SyncMergeResult {
  merged: SyncPayload;
  provisionalRouted: string[];
  archivedNodeIds: string[];
  profileConflictsPending: string[];
}
