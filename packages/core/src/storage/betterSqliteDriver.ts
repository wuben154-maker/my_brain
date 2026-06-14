import Database from "better-sqlite3";

import type { SqlDriver } from "./sqlDriver.js";

/** Node/Vitest SQLite driver — same SQL surface as Expo adapter in apps/mobile. */
export class BetterSqliteDriver implements SqlDriver {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }

  exec(sql: string, params: readonly unknown[] = []): void {
    if (params.length > 0) {
      this.db.prepare(sql).run(...params);
      return;
    }
    // Migration scripts are multi-statement; better-sqlite3 requires exec() not prepare().
    this.db.exec(sql);
  }

  queryAll<T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  queryOne<T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  runInTransaction(fn: () => void): void {
    const tx = this.db.transaction(fn);
    tx();
  }

  close(): void {
    this.db.close();
  }
}
