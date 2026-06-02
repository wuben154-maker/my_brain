import Database from "better-sqlite3";
import type { TauriSqlDatabaseLike } from "@/storage/adapters/tauriSqlDatabase";

/** Map Tauri $1..$N placeholders to SQLite ? with per-occurrence bindings. */
function bindTauriSql(
  sql: string,
  params?: unknown[],
): { sql: string; bindings: unknown[] } {
  if (!params || params.length === 0) {
    return { sql, bindings: [] };
  }
  const bindings: unknown[] = [];
  const converted = sql.replace(/\$(\d+)/g, (_, index: string) => {
    const i = Number(index) - 1;
    if (i < 0 || i >= params.length) {
      throw new Error(`Missing bind parameter $${index}`);
    }
    bindings.push(params[i]);
    return "?";
  });
  return { sql: converted, bindings };
}

/** Wrap an open better-sqlite3 handle with Tauri $1 placeholder SQL (Vitest shim). */
export function wrapBetterSqliteAsTauriDatabase(
  native: Database.Database,
): TauriSqlDatabaseLike {
  return {
    async execute(sql, params) {
      const { sql: statement, bindings } = bindTauriSql(sql, params);
      if (bindings.length === 0) {
        native.exec(statement);
        return { rowsAffected: 0 };
      }
      const result = native.prepare(statement).run(...bindings);
      return { rowsAffected: result.changes };
    },
    async select(sql, params) {
      const { sql: statement, bindings } = bindTauriSql(sql, params);
      if (bindings.length === 0) {
        return native.prepare(statement).all() as never;
      }
      return native.prepare(statement).all(...bindings) as never;
    },
    async close() {
      native.close();
    },
  };
}

export function createTauriSqlTestDatabase(dbPath: string): {
  native: Database.Database;
  database: TauriSqlDatabaseLike;
} {
  const native = new Database(dbPath);
  return { native, database: wrapBetterSqliteAsTauriDatabase(native) };
}

export function createTauriTestDatabaseLoader(dbPath: string): {
  load: (_uri: string) => Promise<TauriSqlDatabaseLike>;
  closeNative: () => void;
} {
  const { native, database } = createTauriSqlTestDatabase(dbPath);
  return {
    load: async () => database,
    closeNative: () => {
      try {
        native.close();
      } catch {
        // already closed via provider.close()
      }
    },
  };
}
