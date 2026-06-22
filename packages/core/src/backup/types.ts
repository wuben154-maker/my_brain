import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import type { UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord, GraphSnapshot } from "../graph/types.js";
import type {
  CorrectionRecord,
  ProfileCorrectionState,
  ProfileTrait,
} from "../profile/correctionHistory.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import type { LearningTraceRecord, WorldItemRecord } from "../storage/mobileStorage.js";

export const BACKUP_MANIFEST_VERSION = 1;

/** M7 §2.1.1 minimum export entity set. */
export const BACKUP_REQUIRED_ENTITIES = [
  "graph_snapshot",
  "graph_history",
  "user_mode_profile",
  "profile_correction_history",
  "profile_suppression_list",
  "profile_traits",
  "learning_trace",
  "provisional_queue",
  "world_items",
  "adaptive_radar_state",
] as const;

export type BackupEntityId = (typeof BACKUP_REQUIRED_ENTITIES)[number];

export interface BackupManifest {
  backup_manifest_version: number;
  included_entities: BackupEntityId[];
  exported_at: string;
  schema_version: number;
  /** Default false — sensitive profile prose excluded unless user opt-in. */
  sensitive_profile_opt_in: boolean;
}

export interface AdaptiveRadarBackupState {
  signals: AdaptiveSignal[];
  cursor?: Record<string, unknown> | null;
}

export interface UserModeProfileBackup {
  profile: UserModeProfile | null;
  coldStartComplete: boolean;
}

export interface BackupSnapshotPayload {
  manifest: BackupManifest;
  graph_snapshot: GraphSnapshot;
  graph_history: GraphChangeRecord[];
  user_mode_profile: UserModeProfileBackup;
  profile_correction_history: CorrectionRecord[];
  profile_suppression_list: string[];
  profile_traits: ProfileTrait[];
  learning_trace: LearningTraceRecord[];
  provisional_queue: ProvisionalCandidate[];
  world_items: WorldItemRecord[];
  adaptive_radar_state: AdaptiveRadarBackupState;
}

export interface BackupExportOptions {
  sensitiveProfileOptIn?: boolean;
  exportedAt?: string;
}

export interface BackupImportOptions {
  /** When false (default), rejects packages with sensitive_profile_opt_in. */
  allowSensitiveProfile?: boolean;
}

export interface BackupRestoreTransaction {
  commit(): void;
  rollback(): void;
}

export interface BackupRestorePort {
  snapshot(): BackupSnapshotPayload;
  beginRestore(next: BackupSnapshotPayload): BackupRestoreTransaction;
}
