/** Shared SQL schema — keep in sync with `src-tauri/migrations/001_init.sql`. */
export const INITIAL_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  intro TEXT NOT NULL,
  source_url TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  salience REAL NOT NULL DEFAULT 1.0,
  last_touched_at TEXT
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  FOREIGN KEY (source_id) REFERENCES concepts(id),
  FOREIGN KEY (target_id) REFERENCES concepts(id)
);

CREATE TABLE IF NOT EXISTS user_profile (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_proposals (
  id          TEXT PRIMARY KEY NOT NULL,
  run_id      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  kind        TEXT NOT NULL,
  summary     TEXT NOT NULL,
  payload     TEXT NOT NULL,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_concepts_archived ON concepts(archived);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_status ON agent_proposals(status);

CREATE TABLE IF NOT EXISTS agent_usage (
  usage_date TEXT PRIMARY KEY NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0
);
`;

export const STORAGE_DB_NAME = "mybrain.db";
