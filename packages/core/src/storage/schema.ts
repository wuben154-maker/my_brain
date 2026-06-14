/** Mobile SQLite schema — aligned with M2 spec; M7 sync fields reserved. */
export const MOBILE_DB_NAME = "mybrain.db";

export const STORAGE_SCHEMA_VERSION = 1;

export const MOBILE_INITIAL_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY NOT NULL,
  concept TEXT NOT NULL,
  intro TEXT NOT NULL,
  source_links_json TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  ingest_source TEXT
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_history (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_mode_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  profile_json TEXT NOT NULL,
  cold_start_complete INTEGER NOT NULL DEFAULT 0,
  profile_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS profile_correction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trait_id TEXT NOT NULL,
  action TEXT NOT NULL,
  at TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS profile_suppression_list (
  trait_id TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_traits (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL,
  suppressed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS provisional_candidates (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_ingest_proposals (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_traces (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS world_items (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adaptive_radar_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  signals_json TEXT NOT NULL DEFAULT '[]',
  cursor_json TEXT
);

CREATE TABLE IF NOT EXISTS provider_config (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  intent TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  user_mode TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_archived ON graph_nodes(archived);
CREATE INDEX IF NOT EXISTS idx_graph_history_created ON graph_history(created_at);
CREATE INDEX IF NOT EXISTS idx_provisional_status ON provisional_candidates(status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_ts ON diagnostic_events(ts);
`;

export const SCHEMA_VERSION_META_KEY = "schema_version";
