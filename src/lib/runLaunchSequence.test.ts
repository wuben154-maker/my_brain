import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import type { NewsItem } from "@/domain/news";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { RADAR_ACTIVE_GOLDEN_COUNT } from "@/radar/worldSources/fixtureWorldSource";
import { createShowcaseGraphSnapshot } from "@/showcase/showcaseFixtures";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphStore } from "@/stores/graphStore";
import type { StorageProvider } from "@/storage/types";
import { useAppStore } from "@/stores/appStore";

const storageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

const mockNewsItems: NewsItem[] = [
  {
    id: "n-boot-1",
    category: "ai_news",
    title: "Boot test headline",
    summary: "Summary",
    sourceName: "Mock RSS",
    sourceUrl: "https://example.com/a",
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
            if (
              typeof window !== "undefined" &&
              window.location.search.includes("radar=1")
            ) {
              throw new Error("mock live source failure");
            }
            return [
              {
                sourceId: "mock",
                sourceLabel: "Mock",
                items: mockNewsItems,
              },
            ];
          },
        },
      };
    },
  };
});

import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
  skipLaunchSelfCheckSpeech,
} from "@/lib/runLaunchSequence";

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

describe("runLaunchSequence (V1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLaunchSequenceGuard();
    stubNavigatorForBoot();
    stubWindowSearch();
    useBriefingStore.getState().clear();
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
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
    storageRef.current = null;
    resetLaunchSequenceGuard();
  });

  // newsQueue lives in appStore only (session-scoped); specs/README debt #4 — not persisted to SQLite.
  it("migrates self_check → loading → companion with newsQueue", async () => {
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await Promise.resolve();

    expect(useAppStore.getState().phase).toBe("self_check");

    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    expect(state.phase).toBe("companion");
    expect(state.newsQueue.length).toBeGreaterThan(0);
    expect(state.selfChecks.some((c) => c.id === "mic")).toBe(true);
    expect(state.selfChecks.some((c) => c.id === "storage")).toBe(true);
  });

  it("fills radar briefing top3 and WorldItemStore in radar launch mode without API keys", async () => {
    vi.stubEnv("VITE_OPENAI_API_KEY", "");
    stubWindowSearch("?radar=1");
    const { storage } = createTempStorage();
    storageRef.current = storage;
    useGraphStore.getState().setGraph(createShowcaseGraphSnapshot());

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    const briefing = useBriefingStore.getState().todayItems;
    expect(state.phase).toBe("companion");
    expect(state.worldItemStore?.listActive()).toHaveLength(RADAR_ACTIVE_GOLDEN_COUNT);
    expect(state.worldItems).toHaveLength(20);
    expect(briefing).toHaveLength(3);
    expect(briefing.map((item) => item.worldItem.id)).toEqual(
      RADAR_RANKING_GOLDEN.top3Ids,
    );
    expect(state.newsQueue).toHaveLength(3);
    expect(state.newsQueue.some((item) => item.id.startsWith("radar-wi-stale-"))).toBe(
      false,
    );
    vi.unstubAllEnvs();
  });

  it("continues to companion without OpenAI key (degraded)", async () => {
    vi.stubEnv("VITE_OPENAI_API_KEY", "");
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    expect(state.phase).toBe("companion");
    const logs = state.bootLogs.join("\n");
    expect(logs).toContain("OpenAI 密钥未配置");
    vi.unstubAllEnvs();
  });

  it("skipLaunchSelfCheckSpeech aborts voice and still reaches loading", async () => {
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await vi.advanceTimersByTimeAsync(900);
    skipLaunchSelfCheckSpeech();
    await vi.runAllTimersAsync();
    await launchPromise;

    const logs = useAppStore.getState().bootLogs.join("\n");
    expect(logs).toContain("自检播报已跳过");
    expect(useAppStore.getState().phase).toBe("companion");
  });
});
