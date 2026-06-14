/**
 * Product invariants placeholder — expanded in M1+ with ingest/sync tests.
 * See AGENTS.md core invariants #1–#7.
 */
export const CORE_INVARIANTS = [
  "raw_audio_discarded_after_session",
  "permanent_nodes_require_user_confirm",
  "auto_curate_after_ingest_is_undoable",
  "delete_means_archive",
  "local_first_no_cloud_backend_mvp",
  "memory_engine_never_writes_graph",
  "interruptible_voice_mandatory",
] as const;

export type CoreInvariant = (typeof CORE_INVARIANTS)[number];
