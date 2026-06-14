import { describe, expect, it, vi } from "vitest";

import { ExpoSqliteDriver, type ExpoSqliteSyncDatabase } from "./expoSqliteDriver";

function createMockDb(): ExpoSqliteSyncDatabase & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    execSync(source: string) {
      calls.push(`exec:${source.slice(0, 24)}`);
    },
    runSync(source: string, ...params: unknown[]) {
      calls.push(`run:${source}:${params.join(",")}`);
      return {};
    },
    getAllSync<T>() {
      calls.push("getAll");
      return [{ id: "row" }] as T[];
    },
    getFirstSync<T>() {
      calls.push("getFirst");
      return { id: "row" } as T;
    },
    withTransactionSync(task: () => void) {
      calls.push("tx:start");
      task();
      calls.push("tx:end");
    },
    closeSync() {
      calls.push("close");
    },
  };
}

describe("ExpoSqliteDriver", () => {
  it("executes parameterized statements synchronously", () => {
    const db = createMockDb();
    const driver = new ExpoSqliteDriver(db);

    driver.exec("INSERT INTO app_meta (key, value) VALUES (?, ?)", ["k", "v"]);
    expect(db.calls).toContain("run:INSERT INTO app_meta (key, value) VALUES (?, ?):k,v");
  });

  it("executes DDL via execSync without params", () => {
    const db = createMockDb();
    const driver = new ExpoSqliteDriver(db);

    driver.exec("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY);");
    expect(db.calls.some((c) => c.startsWith("exec:CREATE TABLE"))).toBe(true);
  });

  it("implements queryAll/queryOne without throwing", () => {
    const driver = new ExpoSqliteDriver(createMockDb());
    expect(driver.queryAll("SELECT 1")).toEqual([{ id: "row" }]);
    expect(driver.queryOne("SELECT 1")).toEqual({ id: "row" });
  });

  it("wraps runInTransaction synchronously", () => {
    const db = createMockDb();
    const driver = new ExpoSqliteDriver(db);
    const inner = vi.fn();

    driver.runInTransaction(inner);

    expect(db.calls).toEqual(["tx:start", "tx:end"]);
    expect(inner).toHaveBeenCalledOnce();
  });
});
