import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
} from "@/lib/runLaunchSequence";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { createShowcaseGraphSnapshot } from "@/showcase/showcaseFixtures";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphStore } from "@/stores/graphStore";
import { useProfileStore } from "@/stores/profileStore";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
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

describe("dailyBriefing integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLaunchSequenceGuard();
    stubNavigatorForBoot();
    stubWindowSearch("?radar=1");
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
    useGraphStore.getState().setGraph(createShowcaseGraphSnapshot());
    useProfileStore.setState({ profile: DEFAULT_USER_PROFILE });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    storageRef.current = null;
    resetLaunchSequenceGuard();
    useBriefingStore.getState().clear();
  });

  it("radar launch fills briefingStore top3 and projects newsQueue", async () => {
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
    expect(useAppStore.getState().newsQueue).toHaveLength(3);
    expect(useAppStore.getState().phase).toBe("companion");
    expect(useAppStore.getState().bootLogs.join("\n")).toContain("WARN");
    for (const item of briefing) {
      expect(item.signals.length).toBeGreaterThanOrEqual(1);
      expect(item.signals[0]?.explanation.trim()).not.toBe("");
    }
  });
});
