/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import {
  resetShowcaseLaunchGuard,
  runShowcaseLaunchSequence,
} from "@/showcase/runShowcaseLaunchSequence";
import {
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_GRAPH_SNAPSHOT,
} from "@/showcase/showcaseFixtures";
import { visibleGraph } from "@/lib/graphMutations";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import type { StorageProvider } from "@/storage/types";

const storageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

const newsFetchSpy = vi.hoisted(() => ({
  count: 0,
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
            newsFetchSpy.count += 1;
            return [];
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

function resetStores(): void {
  useAppStore.setState({
    phase: "self_check",
    selfChecks: [],
    bootProgress: 0,
    bootLogs: [],
    loadingMessage: "正在唤醒大脑…",
    newsQueue: [],
    errorMessage: null,
    providers: null,
    storage: null,
  });
  useGraphStore.setState({ nodes: [], edges: [] });
}

describe("runShowcaseLaunchSequence", () => {
  beforeEach(() => {
    resetStores();
    newsFetchSpy.count = 0;
    resetShowcaseLaunchGuard();
    window.location.search = "?showcase=1";
  });

  afterEach(() => {
    vi.useRealTimers();
    storageRef.current = null;
    window.history.replaceState({}, "", "/");
    delete process.env.VITE_SHOWCASE_DEMO;
    resetShowcaseLaunchGuard();
  });

  it("throws when showcase mode is not enabled", async () => {
    window.location.search = "";
    await expect(runShowcaseLaunchSequence()).rejects.toThrow(/showcase mode/);
  });

  it("migrates boot → self_check → loading → companion with fixture injection", async () => {
    vi.useFakeTimers();
    stubNavigatorForBoot();

    const fixture = createTempStorage();
    storageRef.current = fixture.storage;

    const phases: string[] = [];
    const unsub = useAppStore.subscribe((state) => {
      phases.push(state.phase);
    });

    const launchPromise = runShowcaseLaunchSequence();
    await Promise.resolve();
    expect(useAppStore.getState().phase).toBe("boot");

    await vi.runAllTimersAsync();
    await launchPromise;

    unsub();

    const state = useAppStore.getState();
    expect(state.phase).toBe("companion");
    expect(phases).toContain("boot");
    expect(phases).toContain("self_check");
    expect(phases).toContain("loading");
    expect(phases).toContain("companion");
    expect(state.newsQueue).toHaveLength(3);
    expect(state.newsQueue.map((item) => item.id)).toEqual(
      SHOWCASE_BRIEFING_ITEMS.map((item) => item.id),
    );
    expect(newsFetchSpy.count).toBe(0);

    const display = await fixture.storage.loadGraphForDisplay();
    expect(display.nodes).toHaveLength(SHOWCASE_GRAPH_SNAPSHOT.nodes.length);
    expect(visibleGraph(display).nodes).toHaveLength(8);

    fixture.cleanup();
  });
});
