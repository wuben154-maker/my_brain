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
