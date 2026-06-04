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
