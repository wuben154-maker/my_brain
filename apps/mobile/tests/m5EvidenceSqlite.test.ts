import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const sqlitePath = join(here, "..", "fixtures", "m5-evidence.sqlite");

describe("m5EvidenceSqlite fixture entrypoint", () => {
  it("ships a valid SQLite file with graph + evidence tables", () => {
    const header = readFileSync(sqlitePath).subarray(0, 16).toString("utf8");
    expect(header.startsWith("SQLite format 3")).toBe(true);

    const db = new Database(sqlitePath, { readonly: true });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(
      expect.arrayContaining([
        "graph_nodes",
        "graph_history",
        "learning_traces",
        "world_items",
        "user_mode_profile",
      ]),
    );

    const nodeCount = db.prepare("SELECT COUNT(*) AS c FROM graph_nodes").get() as { c: number };
    const changeCount = db.prepare("SELECT COUNT(*) AS c FROM graph_history").get() as { c: number };
    expect(nodeCount.c).toBeGreaterThan(0);
    expect(changeCount.c).toBeGreaterThan(0);
    db.close();
  });
});
