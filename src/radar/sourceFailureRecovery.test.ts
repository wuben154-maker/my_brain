import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import type { NewsItem } from "@/domain/news";
import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
} from "@/lib/runLaunchSequence";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import * as runRadarBriefingModule from "@/radar/runRadarBriefing";
import { createShowcaseGraphSnapshot } from "@/showcase/showcaseFixtures";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphStore } from "@/stores/graphStore";
import type { StorageProvider } from "@/storage/types";

const storageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

const sourceFailureFlags = vi.hoisted(() => ({
  legacyFlatten: false,
}));

const legacyFlattenItems: NewsItem[] = [
  {
    id: "legacy-rss-1",
    category: "ai_news",
    title: "Legacy flatten fallback headline",
    summary: "RSS flatten legacy path",
    sourceName: "Legacy RSS",
    sourceUrl: "https://example.com/legacy",
    publishedAt: null,
  },
];

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
            if (sourceFailureFlags.legacyFlatten) {
              return [
                {
                  sourceId: "legacy",
                  sourceLabel: "Legacy",
                  items: legacyFlattenItems,
                },
              ];
            }
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

describe("sourceFailureRecovery", () => {
  beforeEach(() => {
    sourceFailureFlags.legacyFlatten = false;
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
    vi.restoreAllMocks();
    storageRef.current = null;
    resetLaunchSequenceGuard();
    useBriefingStore.getState().clear();
  });

  it("falls back to legacy RSS flatten when Radar briefing is empty", async () => {
    sourceFailureFlags.legacyFlatten = true;
    const { storage } = createTempStorage();
    storageRef.current = storage;

    vi.spyOn(runRadarBriefingModule, "runRadarBriefing").mockResolvedValueOnce({
      store: { listActive: () => [] } as never,
      briefingItems: [],
      newsQueue: [],
      warnings: ["mock radar empty"],
    });

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const logs = useAppStore.getState().bootLogs.join("\n");
    expect(logs).toContain("Legacy RSS / GitHub flatten");
    expect(useAppStore.getState().phase).toBe("companion");
    expect(useAppStore.getState().newsQueue).toEqual(legacyFlattenItems);
  });

  it("recovers from live source failure with fixture-backed Radar top3", async () => {
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const briefing = useBriefingStore.getState().todayItems;
    expect(briefing).toHaveLength(3);
    expect(briefing.map((item) => item.worldItem.id)).toEqual(
      RADAR_RANKING_GOLDEN.top3Ids,
    );
    expect(useAppStore.getState().phase).toBe("companion");
    expect(useAppStore.getState().bootLogs.join("\n")).toContain("WARN");
  });
});
