import type Database from "better-sqlite3";

interface TauriConceptMigrator {
  select<T>(sql: string): Promise<T>;
  execute(sql: string): Promise<unknown>;
}

/** Idempotent column adds for concepts.salience (M2). */
export function migrateConceptSalienceColumnsSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(concepts)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("salience")) {
    db.exec(
      "ALTER TABLE concepts ADD COLUMN salience REAL NOT NULL DEFAULT 1.0",
    );
  }
  if (!names.has("last_touched_at")) {
    db.exec("ALTER TABLE concepts ADD COLUMN last_touched_at TEXT");
  }
}

export async function migrateConceptSalienceColumnsTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(concepts)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("salience")) {
    await db.execute(
      "ALTER TABLE concepts ADD COLUMN salience REAL NOT NULL DEFAULT 1.0",
    );
  }
  if (!names.has("last_touched_at")) {
    await db.execute("ALTER TABLE concepts ADD COLUMN last_touched_at TEXT");
  }
}

const GRAPH_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS graph_history (
  id TEXT PRIMARY KEY NOT NULL,
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  undone INTEGER NOT NULL DEFAULT 0
);
`;

export function migrateGraphHistoryTableSqlite(db: Database.Database): void {
  db.exec(GRAPH_HISTORY_TABLE_SQL);
}

export async function migrateGraphHistoryTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(GRAPH_HISTORY_TABLE_SQL);
}

/** Idempotent column adds for graph_history provenance (W2). */
export function migrateGraphHistoryProvenanceSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(graph_history)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("reason_code")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN reason_code TEXT NOT NULL DEFAULT 'manual'",
    );
  }
  if (!names.has("reason_detail")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN reason_detail TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!names.has("affected_node_ids")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN affected_node_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("affected_edge_ids")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN affected_edge_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("edge_migrations")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN edge_migrations TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

export async function migrateGraphHistoryProvenanceTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(graph_history)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("reason_code")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN reason_code TEXT NOT NULL DEFAULT 'manual'",
    );
  }
  if (!names.has("reason_detail")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN reason_detail TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!names.has("affected_node_ids")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN affected_node_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("affected_edge_ids")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN affected_edge_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("edge_migrations")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN edge_migrations TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

/** Idempotent column adds for concepts temporal provenance (W2). */
export function migrateConceptTemporalColumnsSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(concepts)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived_at")) {
    db.exec("ALTER TABLE concepts ADD COLUMN archived_at TEXT");
  }
  if (!names.has("supersedes_node_id")) {
    db.exec("ALTER TABLE concepts ADD COLUMN supersedes_node_id TEXT");
  }
}

export async function migrateConceptTemporalColumnsTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(concepts)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived_at")) {
    await db.execute("ALTER TABLE concepts ADD COLUMN archived_at TEXT");
  }
  if (!names.has("supersedes_node_id")) {
    await db.execute("ALTER TABLE concepts ADD COLUMN supersedes_node_id TEXT");
  }
}

const LEARNING_TRACES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS learning_traces (
  id TEXT PRIMARY KEY NOT NULL,
  concept_ref TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  session_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_learning_traces_concept_ref ON learning_traces(concept_ref);
CREATE INDEX IF NOT EXISTS idx_learning_traces_session_id ON learning_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_traces_at ON learning_traces(at);
`;

export function migrateLearningTracesTableSqlite(db: Database.Database): void {
  db.exec(LEARNING_TRACES_TABLE_SQL);
}

export async function migrateLearningTracesTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(LEARNING_TRACES_TABLE_SQL);
}

const COGNITIVE_ACTIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS cognitive_actions (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  citations_json TEXT NOT NULL DEFAULT '[]',
  permission_level TEXT NOT NULL DEFAULT 'suggest',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_actions_status ON cognitive_actions(status);
CREATE INDEX IF NOT EXISTS idx_cognitive_actions_kind ON cognitive_actions(kind);
`;

export function migrateCognitiveActionsTableSqlite(db: Database.Database): void {
  db.exec(COGNITIVE_ACTIONS_TABLE_SQL);
}

export async function migrateCognitiveActionsTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(COGNITIVE_ACTIONS_TABLE_SQL);
}

/** Idempotent metadata_json column for cognitive_actions (KOS-E2). */
export function migrateCognitiveActionsMetadataColumnSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(cognitive_actions)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("metadata_json")) {
    db.exec(
      "ALTER TABLE cognitive_actions ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'",
    );
  }
}

export async function migrateCognitiveActionsMetadataColumnTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(cognitive_actions)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("metadata_json")) {
    await db.execute(
      "ALTER TABLE cognitive_actions ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'",
    );
  }
}

/** Idempotent column add for concepts provenance (KOS-D1). */
export function migrateConceptSourceRefsColumnsSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(concepts)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("source_refs_json")) {
    db.exec(
      "ALTER TABLE concepts ADD COLUMN source_refs_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

export async function migrateConceptSourceRefsColumnsTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(concepts)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("source_refs_json")) {
    await db.execute(
      "ALTER TABLE concepts ADD COLUMN source_refs_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

/** Idempotent column add for edges.archived (KOS-A3 undo without SQL DELETE). */
export function migrateEdgeArchivedColumnSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(edges)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived")) {
    db.exec("ALTER TABLE edges ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
    db.exec("CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived)");
  }
}

export async function migrateEdgeArchivedColumnTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(edges)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived")) {
    await db.execute(
      "ALTER TABLE edges ADD COLUMN archived INTEGER NOT NULL DEFAULT 0",
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived)",
    );
  }
}
