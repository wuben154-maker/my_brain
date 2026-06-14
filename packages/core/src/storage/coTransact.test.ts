import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { BetterSqliteDriver } from "./betterSqliteDriver.js";
import { MobileStorage } from "./mobileStorage.js";

describe("coTransact graph and history", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
  });

  it("writes graph and history in one transaction", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-cotransact-"));
    const driver = new BetterSqliteDriver(join(dir, "t.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };

    const before = { nodes: [], edges: [] };
    const after = {
      nodes: [
        {
          id: "n1",
          concept: "A",
          intro: "a",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-13T00:00:00.000Z",
        },
      ],
      edges: [],
    };

    storage.coTransactGraphAndHistory(before, after, {
      id: "h1",
      kind: "node_created",
      summary: "ok",
      before,
      after,
      createdAt: "2026-06-13T00:00:00.000Z",
      undone: false,
    });

    expect(storage.loadHistory()).toHaveLength(1);
  });
});
