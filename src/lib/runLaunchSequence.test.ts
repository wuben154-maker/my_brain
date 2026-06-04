import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import type { NewsItem } from "@/domain/news";
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
    createAppProviders: (env: { openAiApiKey: string }) => {
      const providers = actual.createAppProviders(env);
      return {
        ...providers,
        news: {
          list: () => providers.news.list(),
          fetchAll: async () => [
            {
              sourceId: "mock",
              sourceLabel: "Mock",
              items: mockNewsItems,
            },
          ],
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

describe("runLaunchSequence (V1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLaunchSequenceGuard();
    useAppStore.setState({
      phase: "boot",
      selfChecks: [],
      bootProgress: 0,
      bootLogs: [],
      loadingMessage: "正在唤醒大脑…",
      newsQueue: [],
      errorMessage: null,
      providers: null,
      storage: null,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    storageRef.current = null;
    resetLaunchSequenceGuard();
  });

  it("migrates boot → self_check → loading → companion with newsQueue", async () => {
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();

    await vi.advanceTimersByTimeAsync(700);
    expect(useAppStore.getState().phase).toBe("self_check");

    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    expect(state.phase).toBe("companion");
    expect(state.newsQueue.length).toBeGreaterThan(0);
    expect(state.selfChecks.some((c) => c.id === "mic")).toBe(true);
  });

  it("continues to companion when api_key check warns (degraded)", async () => {
    vi.stubEnv("VITE_OPENAI_API_KEY", "");
    const { storage } = createTempStorage();
    storageRef.current = storage;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    expect(state.phase).toBe("companion");
    const apiCheck = state.selfChecks.find((c) => c.id === "api_key");
    expect(apiCheck?.status).toBe("warn");
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
