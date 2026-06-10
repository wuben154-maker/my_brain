import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
} from "@/lib/runLaunchSequence";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { RADAR_ACTIVE_GOLDEN_COUNT } from "@/radar/worldSources/fixtureWorldSource";
import { createShowcaseGraphSnapshot } from "@/showcase/showcaseFixtures";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphStore } from "@/stores/graphStore";
import type { StorageProvider } from "@/storage/types";

const storageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

vi.mock("@/storage/createStorageProvider", () => ({
  createStorageProvider: () => {
    if (!storageRef.current) {
      throw new Error("storageRef not initialized");
    }
    return storageRef.current;
  },
}));

vi.mock("@/providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/providers")>();
  return {
    ...actual,
    createAppProviders: (
      env: { openAiApiKey: string },
      options?: Parameters<typeof actual.createAppProviders>[1],
    ) => {
      const providers = actual.createAppProviders(env, options);
      return {
        ...providers,
        news: {
          list: () => providers.news.list(),
          fetchAll: async () => {
            throw new Error("mock live source failure");
          },
        },
      };
    },
  };
});

function stubNavigatorForBoot(): void {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn() },
    onLine: true,
  });
}

function stubWindowSearch(search = ""): void {
  vi.stubGlobal("window", {
    location: { search },
    history: {
      replaceState: vi.fn((_state: unknown, _title: string, url: string) => {
        window.location.search = url.includes("?") ? `?${url.split("?")[1]}` : "";
      }),
    },
  });
}

describe("radarLaunch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLaunchSequenceGuard();
    stubNavigatorForBoot();
    stubWindowSearch();
    useBriefingStore.getState().clear();
    useGraphStore.getState().setGraph(createShowcaseGraphSnapshot());
    useAppStore.setState({
      phase: "self_check",
      selfChecks: [],
      bootProgress: 0,
      bootLogs: [],
      loadingMessage: "正在唤醒大脑…",
      newsQueue: [],
      worldItemStore: null,
      worldItems: [],
      errorMessage: null,
      providers: null,
      storage: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    storageRef.current = null;
    resetLaunchSequenceGuard();
    useBriefingStore.getState().clear();
  });

  it("defaults to Radar mock-first without query flag", async () => {
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const logs = useAppStore.getState().bootLogs.join("\n");
    expect(logs).toContain("Radar（默认 mock-first）");
    expect(logs).not.toContain("Legacy RSS / GitHub flatten");

    const briefing = useBriefingStore.getState().todayItems;
    expect(briefing).toHaveLength(3);
    expect(briefing.map((item) => item.worldItem.id)).toEqual(
      RADAR_RANKING_GOLDEN.top3Ids,
    );
    for (const item of briefing) {
      expect(item.signals.length).toBeGreaterThanOrEqual(1);
    }
    expect(useAppStore.getState().phase).toBe("companion");
  });

  it("keeps ?radar=1 as an explicit alias to the same Radar path", async () => {
    stubWindowSearch("?radar=1");
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const logs = useAppStore.getState().bootLogs.join("\n");
    expect(logs).toContain("Radar（显式 ?radar=1）");
    expect(useBriefingStore.getState().todayItems).toHaveLength(3);
  });

  it("does not persist KnowledgeGraph nodes during default Radar launch", async () => {
    const { storage } = createTempStorage();
    await storage.init();
    storageRef.current = storage;
    const nodesBefore = (await storage.loadGraph()).nodes.length;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const nodesAfter = (await storage.loadGraph()).nodes.length;
    expect(nodesAfter).toBe(nodesBefore);
    expect(useAppStore.getState().worldItemStore?.listActive()).toHaveLength(
      RADAR_ACTIVE_GOLDEN_COUNT,
    );
  });
});
