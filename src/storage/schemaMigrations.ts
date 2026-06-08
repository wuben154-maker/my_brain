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
