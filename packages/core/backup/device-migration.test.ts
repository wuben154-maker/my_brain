import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { BetterSqliteDriver } from "../src/storage/betterSqliteDriver.js";
import { MobileStorage } from "../src/storage/mobileStorage.js";
import { exportBackupSnapshotFromStorage } from "../src/backup/exportBackup.js";
import { importBackupSnapshot } from "../src/backup/importBackup.js";
import { createPopulatedStorage, reopenStorage } from "../src/backup/testFixtures.js";

describe("deviceMigration backup round-trip", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("exports and imports full M7A entity set atomically on a fresh device DB", () => {
    const source = createPopulatedStorage();
    cleanup = source.cleanup;

    const payload = exportBackupSnapshotFromStorage(source.storage);
    const dir = mkdtempSync(join(tmpdir(), "mybrain-device-b-"));
    const targetPath = join(dir, "device-b.db");
    const targetDriver = new BetterSqliteDriver(targetPath);
    const targetStorage = new MobileStorage(targetDriver);
    targetStorage.migrate();

    importBackupSnapshot(targetStorage, payload);

    const restored = targetStorage.hydrateBundle();
    expect(restored.profile?.primaryMode).toBe("learner");
    expect(restored.correctionState.suppressionList).toContain("mode-learner");
    expect(restored.graph.nodes).toHaveLength(2);
    expect(restored.graph.nodes.find((n) => n.id === "node-archived-1")?.archived).toBe(true);
    expect(restored.history).toHaveLength(1);
    expect(restored.provisional).toHaveLength(2);
    expect(restored.provisional.find((p) => p.status === "pending")?.ingestSource).toBe(
      "provisional_pending",
    );
    expect(restored.learningTraces).toHaveLength(1);
    expect(restored.worldItems).toHaveLength(1);
    expect(restored.signals.length).toBeGreaterThan(0);
    expect(targetStorage.loadAdaptiveRadarCursor()).toEqual({
      lastSeenId: "sig-0",
      offset: 2,
    });

    targetDriver.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not leave partial graph when import validation fails mid-restore", () => {
    const source = createPopulatedStorage();
    cleanup = source.cleanup;
    const payload = exportBackupSnapshotFromStorage(source.storage);
    payload.manifest.included_entities = payload.manifest.included_entities.filter(
      (entity) => entity !== "profile_correction_history",
    );

    const dir = mkdtempSync(join(tmpdir(), "mybrain-device-fail-"));
    const dbPath = join(dir, "fail.db");
    const { storage, driver } = reopenStorage(dbPath);
    storage.saveGraphSnapshot({
      nodes: [
        {
          id: "local-only",
          concept: "本地",
          intro: "不应被部分覆盖",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          confirmedAt: "2026-06-01T00:00:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [],
    });

    expect(() => importBackupSnapshot(storage, payload)).toThrow();
    expect(storage.loadGraphSnapshot().nodes[0]?.id).toBe("local-only");
    driver.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
