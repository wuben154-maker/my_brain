import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BetterSqliteDriver,
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  MobileStorage,
  applyProfileCorrection,
  createEmptyCorrectionState,
  createProvisionalCandidate,
  generateAdaptiveSignals,
  seedTraitsFromProfile,
} from "@my-brain/core";

import { hydrateMobileStores, persistMobileState } from "./persistHydrate";
import { useMobileAppStore } from "./mobileAppStore";
import { useProvisionalStore } from "./provisionalStore";
import { getStorageSession, setStorageSession } from "../storage/storageSession";

function seedStorage(storage: MobileStorage): void {
  const profile = {
    primaryMode: "learner" as const,
    secondaryModes: ["tech_tracker" as const],
    confidence: 0.88,
    recentIntent: "系统学习 AI",
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
        id: "rehydrate-node",
        concept: "冷启动",
        intro: "重启后仍在",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-13T00:00:00.000Z",
        confirmedAt: "2026-06-13T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [],
  });
  storage.saveHistoryEntry({
    id: "rehydrate-change",
    kind: "node_created",
    summary: "首颗星",
    before: { nodes: [], edges: [] },
    after: {
      nodes: [
        {
          id: "rehydrate-node",
          concept: "冷启动",
          intro: "重启后仍在",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-13T00:00:00.000Z",
          confirmedAt: "2026-06-13T00:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [],
    },
    createdAt: "2026-06-13T00:01:00.000Z",
    undone: false,
  });
  const candidate = createProvisionalCandidate({
    sourceType: "text",
    summary: "待处理星尘",
  });
  candidate.ingestSource = "provisional_pending";
  storage.saveProvisionalCandidates([candidate]);
  storage.saveLearningTraces([
    {
      id: "lt-rehydrate",
      topic: "向量检索",
      note: "来自真实 trace",
      createdAt: "2026-06-13T02:00:00.000Z",
    },
  ]);
  storage.saveAdaptiveSignals(generateAdaptiveSignals(profile, correction.suppressionList));
  storage.saveProviderConfig({
    llm: "mock",
    radar: "fixture",
    voice: "disconnected",
    storage: "ready",
  });
}

describe("persistHydrate (CS-S12)", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    useMobileAppStore.setState({
      phase: "launch",
      coldStartComplete: false,
      userProfile: null,
      signals: [],
      learningTraces: [],
      correctionState: createEmptyCorrectionState(),
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      visibleNodes: [],
      storageReady: false,
      hasApiKey: false,
    });
    useProvisionalStore.setState({ candidates: [], lastExplanation: null });
  });

  afterEach(() => {
    setStorageSession(null);
    cleanup?.();
    cleanup = undefined;
  });

  it("rehydrates coldStartComplete, graph, corrections, provisional, traces, degraded", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-persist-hydrate-"));
    const driver = new BetterSqliteDriver(join(dir, "mobile.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    seedStorage(storage);
    setStorageSession({ storage, driver, dbPath: join(dir, "mobile.db") });

    const bundle = storage.hydrateBundle();
    hydrateMobileStores(bundle, false, false);

    const state = useMobileAppStore.getState();
    expect(state.coldStartComplete).toBe(true);
    expect(state.phase).toBe("adaptive_live");
    expect(state.userProfile?.primaryMode).toBe("learner");
    expect(state.correctionState.suppressionList).toContain("mode-tech_tracker");
    expect(state.graph.countVisibleNodes()).toBe(1);
    expect(state.signals.length).toBeGreaterThan(0);
    expect(state.learningTraces).toHaveLength(1);
    expect(state.learningTraces[0]?.topic).toBe("向量检索");
    expect(state.degraded.active).toContain("mock_llm");
    expect(state.degraded.active).toContain("voice_disconnected");
    expect(state.degraded.providerMode).toBe("mock");
    expect(useProvisionalStore.getState().candidates).toHaveLength(1);

    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
  });

  it("fresh empty bundle preserves launch phase until finishLaunch", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-persist-empty-"));
    const driver = new BetterSqliteDriver(join(dir, "mobile.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    setStorageSession({ storage, driver, dbPath: join(dir, "mobile.db") });

    expect(useMobileAppStore.getState().phase).toBe("launch");
    hydrateMobileStores(storage.hydrateBundle(), false, false);

    expect(useMobileAppStore.getState().phase).toBe("launch");
    expect(useMobileAppStore.getState().coldStartComplete).toBe(false);
    expect(useMobileAppStore.getState().storageReady).toBe(true);

    useMobileAppStore.getState().finishLaunch();
    expect(useMobileAppStore.getState().phase).toBe("empty_invite");

    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
  });

  it("re-hydrate after storage ready does not pin launch phase", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-persist-rehydrate-"));
    const driver = new BetterSqliteDriver(join(dir, "mobile.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    setStorageSession({ storage, driver, dbPath: join(dir, "mobile.db") });

    hydrateMobileStores(storage.hydrateBundle(), false, false);
    expect(useMobileAppStore.getState().phase).toBe("launch");

    useMobileAppStore.setState({ phase: "launch", storageReady: true });
    hydrateMobileStores(storage.hydrateBundle(), false, false);
    expect(useMobileAppStore.getState().phase).toBe("empty_invite");

    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
  });

  it("coldStartComplete skips in-app launch phase", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-persist-cold-complete-"));
    const driver = new BetterSqliteDriver(join(dir, "mobile.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    seedStorage(storage);
    setStorageSession({ storage, driver, dbPath: join(dir, "mobile.db") });

    useMobileAppStore.setState({ phase: "launch", storageReady: false });
    hydrateMobileStores(storage.hydrateBundle(), false, false);
    expect(useMobileAppStore.getState().phase).toBe("adaptive_live");

    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
  });

  it("persistMobileState round-trips learning traces and cold-start flag", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-persist-roundtrip-"));
    const driver = new BetterSqliteDriver(join(dir, "mobile.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    seedStorage(storage);
    setStorageSession({ storage, driver, dbPath: join(dir, "mobile.db") });

    hydrateMobileStores(storage.hydrateBundle(), false, false);
    useMobileAppStore.setState({ storageReady: true });
    persistMobileState();

    const reloaded = storage.hydrateBundle();
    expect(reloaded.coldStartComplete).toBe(true);
    expect(reloaded.learningTraces).toHaveLength(1);
    expect(reloaded.correctionState.suppressionList).toContain("mode-tech_tracker");
    expect(reloaded.provisional).toHaveLength(1);

    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
  });
});
