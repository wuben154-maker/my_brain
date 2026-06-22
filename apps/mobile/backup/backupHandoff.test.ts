import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyProfileCorrection,
  BetterSqliteDriver,
  createEmptyCorrectionState,
  createProvisionalCandidate,
  MobileStorage,
  seedTraitsFromProfile,
} from "@my-brain/core";

import { exportLocalBackup, importLocalBackup, importLocalBackupAndRehydrate } from "./backupHandoff";
import { setStorageSession } from "../storage/storageSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { createEmptyCorrectionState, InMemoryGraphRepository, InMemoryHistoryRepository } from "@my-brain/core";

function createSession(): { session: { storage: MobileStorage; driver: BetterSqliteDriver; dbPath: string }; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "mybrain-mobile-backup-"));
  const dbPath = join(dir, "mobile.db");
  const driver = new BetterSqliteDriver(dbPath);
  const storage = new MobileStorage(driver);
  storage.migrate();

  const profile = {
    primaryMode: "tech_tracker" as const,
    secondaryModes: [] as const,
    confidence: 0.9,
    recentIntent: "跟进 AI 新闻",
  };
  storage.saveUserModeProfile(profile, true);
  let correction = {
    ...createEmptyCorrectionState(),
    traits: seedTraitsFromProfile(profile),
  };
  correction = applyProfileCorrection(correction, "mode-tech_tracker", "suppress");
  storage.saveCorrectionState(correction);
  storage.saveGraphSnapshot({
    nodes: [
      {
        id: "m-node-1",
        concept: "向量数据库",
        intro: "embedding 检索",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-13T00:00:00.000Z",
        confirmedAt: "2026-06-13T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [],
  });
  const candidate = createProvisionalCandidate({
    sourceType: "link",
    summary: "待确认",
    linkUrl: "https://example.com/x",
  });
  candidate.ingestSource = "provisional_pending";
  storage.saveProvisionalCandidates([candidate]);
  storage.saveLearningTraces([
    { id: "lt-mobile", topic: "AI", note: "note", createdAt: "2026-06-13T01:00:00.000Z" },
  ]);
  storage.saveWorldItems([
    { id: "wi-mobile", title: "Signal", freshness: 0.5, updatedAt: "2026-06-13T01:00:00.000Z" },
  ]);
  storage.saveAdaptiveSignals([], { offset: 0 });

  return {
    session: { storage, driver, dbPath },
    cleanup: () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe("M7A mobile backup handoff", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    setStorageSession(null);
    useMobileAppStore.setState({
      phase: "launch",
      coldStartComplete: false,
      userProfile: null,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      correctionState: createEmptyCorrectionState(),
      storageReady: false,
      hasApiKey: false,
    });
  });

  afterEach(() => {
    setStorageSession(null);
    cleanup?.();
  });

  it("sync-export-import round-trips through storage session", () => {
    const source = createSession();
    cleanup = source.cleanup;
    const exported = exportLocalBackup(source.session);
    expect(exported.ok).toBe(true);
    if (!exported.ok) {
      return;
    }
    expect(exported.entityCount).toBeGreaterThanOrEqual(10);

    const targetDir = mkdtempSync(join(tmpdir(), "mybrain-mobile-target-"));
    const targetDriver = new BetterSqliteDriver(join(targetDir, "target.db"));
    const targetStorage = new MobileStorage(targetDriver);
    targetStorage.migrate();
    const targetSession = {
      storage: targetStorage,
      driver: targetDriver,
      dbPath: join(targetDir, "target.db"),
    };

    const imported = importLocalBackup(targetSession, exported.json);
    expect(imported.ok).toBe(true);
    expect(imported.ok && imported.restoredEntities).toBe(exported.entityCount);
    expect(targetStorage.loadCorrectionState().suppressionList).toContain("mode-tech_tracker");
    expect(targetStorage.loadProvisionalCandidates()[0]?.ingestSource).toBe("provisional_pending");
    expect(targetStorage.loadUserModeProfile().profile?.primaryMode).toBe("tech_tracker");

    targetDriver.close();
    rmSync(targetDir, { recursive: true, force: true });
  });

  it("importLocalBackup surfaces malformed JSON with hint code", () => {
    const source = createSession();
    cleanup = source.cleanup;
    const result = importLocalBackup(source.session, "{not-json");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.hintCode).toBe("import:malformed_json");
    expect(result.reason).toMatch(/parse failed/i);
    expect(source.session.storage.loadGraphSnapshot().nodes).toHaveLength(1);
  });

  it("importLocalBackup rejects empty paste payload", () => {
    const source = createSession();
    cleanup = source.cleanup;
    const result = importLocalBackup(source.session, "   ");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.hintCode).toBe("import:malformed_json");
  });

  it("importLocalBackupAndRehydrate syncs in-memory store after sqlite import", () => {
    const source = createSession();
    cleanup = source.cleanup;
    const exported = exportLocalBackup(source.session);
    expect(exported.ok).toBe(true);
    if (!exported.ok) {
      return;
    }

    const targetDir = mkdtempSync(join(tmpdir(), "mybrain-mobile-rehydrate-"));
    const targetDriver = new BetterSqliteDriver(join(targetDir, "target.db"));
    const targetStorage = new MobileStorage(targetDriver);
    targetStorage.migrate();
    const targetSession = {
      storage: targetStorage,
      driver: targetDriver,
      dbPath: join(targetDir, "target.db"),
    };
    setStorageSession(targetSession);

    const imported = importLocalBackupAndRehydrate(targetSession, exported.json, false);
    expect(imported.ok).toBe(true);

    const state = useMobileAppStore.getState();
    expect(state.coldStartComplete).toBe(true);
    expect(state.userProfile?.primaryMode).toBe("tech_tracker");
    expect(state.graph.countVisibleNodes()).toBe(1);
    expect(state.correctionState.suppressionList).toContain("mode-tech_tracker");
    expect(state.phase).toBe("adaptive_live");

    targetDriver.close();
    rmSync(targetDir, { recursive: true, force: true });
  });
});
