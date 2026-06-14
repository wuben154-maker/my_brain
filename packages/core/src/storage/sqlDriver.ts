/** Platform-neutral SQL driver — Expo adapter in mobile app; better-sqlite3 in Vitest. */
export interface SqlDriver {
  exec(sql: string, params?: readonly unknown[]): void;
  queryAll<T extends Record<string, unknown>>(sql: string, params?: readonly unknown[]): T[];
  queryOne<T extends Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): T | undefined;
  runInTransaction(fn: () => void): void;
}
