/** Minimal SQL plugin surface shared by @tauri-apps/plugin-sql and Vitest shim. */
export interface TauriSqlDatabaseLike {
  execute(
    sql: string,
    params?: unknown[],
  ): Promise<{ rowsAffected?: number }>;
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  close(): Promise<void>;
}
