import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";

import {
  createEmptyCorrectionState,
  seedTraitsFromProfile,
} from "../profile/correctionHistory.js";
import { createProvisionalCandidate } from "../provisional/queue.js";
import { BetterSqliteDriver } from "./betterSqliteDriver.js";
import { MobileStorage } from "./mobileStorage.js";
import { STORAGE_SCHEMA_VERSION } from "./schema.js";

function createFixture(): { storage: MobileStorage; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "mybrain-mobile-storage-"));
  const dbPath = join(dir, "test.db");
  const driver = new BetterSqliteDriver(dbPath);
  const storage = new MobileStorage(driver);
  storage.migrate();
  return {
    storage,
    cleanup: () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe("mobileStorage fixture", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("migrates to expected schema version", () => {
    const fx = createFixture();
    cleanup = fx.cleanup;
    expect(fx.storage.getSchemaVersion()).toBe(STORAGE_SCHEMA_VERSION);
  });

  it("persists graph + history and coTransact atomically", () => {
    const fx = createFixture();
    cleanup = fx.cleanup;
    const before = { nodes: [], edges: [] };
    const after = {
      nodes: [
        {
          id: "n1",
          concept: "SQLite",
          intro: "本地数据库",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-13T00:00:00.000Z",
        },
      ],
      edges: [],
    };
    fx.storage.coTransactGraphAndHistory(before, after, {
      id: "h1",
      kind: "node_created",
      summary: "创建节点",
      before,
      after,
      createdAt: "2026-06-13T00:00:00.000Z",
      undone: false,
    });
    const loaded = fx.storage.loadGraphSnapshot();
    expect(loaded.nodes).toHaveLength(1);
    expect(fx.storage.loadHistory()).toHaveLength(1);
  });

  it("persists profile correction history across reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-mobile-storage-"));
    const dbPath = join(dir, "test.db");
    const profile = {
      primaryMode: "learner" as const,
      secondaryModes: ["personal_memory" as const],
      confidence: 0.8,
      recentIntent: "学习 Rust",
    };
    {
      const driver = new BetterSqliteDriver(dbPath);
      const storage = new MobileStorage(driver);
      storage.migrate();
      storage.saveUserModeProfile(profile, true);
      const correction = {
        ...createEmptyCorrectionState(),
        traits: seedTraitsFromProfile(profile),
      };
      correction.suppressionList = ["mode-learner"];
      storage.saveCorrectionState(correction);
      driver.close();
    }
    {
      const driver = new BetterSqliteDriver(dbPath);
      const storage = new MobileStorage(driver);
      storage.migrate();
      const bundle = storage.hydrateBundle();
      expect(bundle.coldStartComplete).toBe(true);
      expect(bundle.profile?.primaryMode).toBe("learner");
      expect(bundle.correctionState.suppressionList).toContain("mode-learner");
      driver.close();
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("persists provisional queue and pending ingest proposal", () => {
    const fx = createFixture();
    cleanup = fx.cleanup;
    const candidate = createProvisionalCandidate({
      sourceType: "text",
      summary: "待整理想法",
    });
    fx.storage.saveProvisionalCandidates([candidate]);
    fx.storage.savePendingIngestProposal({
      id: "proposal-1",
      concept: "测试概念",
      intro: "简介",
      sourceLinks: ["ref-1"],
      createdAt: new Date().toISOString(),
    });
    expect(fx.storage.loadProvisionalCandidates()).toHaveLength(1);
    expect(fx.storage.loadPendingIngestProposal()?.id).toBe("proposal-1");
  });

  it("ring buffer stores only whitelisted diagnostic fields", () => {
    const fx = createFixture();
    cleanup = fx.cleanup;
    fx.storage.appendDiagnosticEvent({
      intent: "migration_retry",
      outcome: "ok",
      reasonCode: "SchemaMigrationError",
      userMode: "learner",
    });
    const events = fx.storage.listDiagnosticEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.intent).toBe("migration_retry");
    expect(events[0]).not.toHaveProperty("intro");
  });
});
