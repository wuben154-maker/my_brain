/**
 * Runtime Expo SQLite adapter — implements core SqlDriver via sync expo-sqlite APIs.
 * Vitest/Node uses BetterSqliteDriver from testStorageSession instead.
 */
import type { SqlDriver } from "@my-brain/core";

/** Minimal sync surface from expo-sqlite SQLiteDatabase (SDK 52). */
export interface ExpoSqliteSyncDatabase {
  execSync(source: string): void;
  runSync(source: string, ...params: unknown[]): unknown;
  getAllSync<T>(source: string, ...params: unknown[]): T[];
  getFirstSync<T>(source: string, ...params: unknown[]): T | null;
  withTransactionSync(task: () => void): void;
  closeSync(): void;
}

export class ExpoSqliteDriver implements SqlDriver {
  constructor(private readonly db: ExpoSqliteSyncDatabase) {}

  exec(sql: string, params: readonly unknown[] = []): void {
    if (params.length > 0) {
      this.db.runSync(sql, ...params);
      return;
    }
    // Migration DDL is multi-statement; execSync matches better-sqlite3 .exec().
    this.db.execSync(sql);
  }

  queryAll<T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): T[] {
    return this.db.getAllSync<T>(sql, ...params);
  }

  queryOne<T extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = [],
  ): T | undefined {
    const row = this.db.getFirstSync<T>(sql, ...params);
    return row ?? undefined;
  }

  runInTransaction(fn: () => void): void {
    this.db.withTransactionSync(fn);
  }

  close(): void {
    this.db.closeSync();
  }
}
