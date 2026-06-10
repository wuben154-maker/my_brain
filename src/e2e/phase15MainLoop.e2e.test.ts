/**
 * KP-09 default main-path E2E — no showcase flag.
 * Chain: Radar top3 + signals → voice ingest → auto-curate → undo → Weekly Review cites history.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyIngestDecision } from "@/conversation/ingestActions";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import { computeReviewWindow } from "@/domain/review/reviewWindow";
import { citationKey } from "@/domain/review/weeklyBrainReview";
import { isConceptNode } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createTempStorage } from "@/invariants/testStorage";
import { parseIngestCommand } from "@/lib/parseIngestCommand";
import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
} from "@/lib/runLaunchSequence";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useIngestStore } from "@/stores/ingestStore";
import { useProfileStore } from "@/stores/profileStore";
import type { StorageProvider } from "@/storage/types";

const storageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

const mockNewsItems: NewsItem[] = [
  {
    id: "n-phase15-e2e",
    category: "ai_news",
    title: "Launch phase15 headline",
    summary: "Summary for KP-09 main loop gate",
    sourceName: "Mock RSS",
    sourceUrl: "https://example.com/phase15-e2e",
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

const stalePeerNode = {
  id: "stale-peer-phase15",
  title: "过时条目",
  intro: "stale peer for phase15 auto-curate",
  sourceUrl: null,
  archived: false,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-06-01T00:00:00.000Z",
};

const linkPeerNode = {
  id: "peer-vectordb-phase15",
  title: "向量数据库 基础",
  intro: "existing peer for link proposal",
  sourceUrl: null,
  archived: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function stubNavigatorForBoot(): void {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn() },
    onLine: true,
  });
}

function resetHarnessStores(): void {
  useIngestStore.getState().reset();
  useGraphHistoryStore.getState().clear();
  useProfileStore.getState().reset();
  useBriefingStore.getState().clear();
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
}

describe("phase15MainLoop", () => {
  beforeEach(() => {
    resetHarnessStores();
    delete process.env.VITE_SHOWCASE_DEMO;
  });

  afterEach(() => {
    vi.useRealTimers();
    storageRef.current = null;
    resetLaunchSequenceGuard();
  });

  it("default path: radar top3+signals → ingest → auto-curate → undo → weekly review cites history", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    stubNavigatorForBoot();

    const fixture = createTempStorage();
    storageRef.current = fixture.storage;

    const launchPromise = runLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;

    await fixture.storage.saveConcept(stalePeerNode);
    await fixture.storage.saveConcept(linkPeerNode);

    const appState = useAppStore.getState();
    const briefing = useBriefingStore.getState().todayItems;
    expect(appState.phase).toBe("companion");
    expect(appState.newsQueue).toHaveLength(3);
    expect(briefing).toHaveLength(3);
    expect(briefing.map((item) => item.worldItem.id)).toEqual(
      RADAR_RANKING_GOLDEN.top3Ids,
    );
    for (const item of briefing) {
      expect(item.signals.length).toBeGreaterThanOrEqual(1);
      expect(item.signals[0]?.explanation.trim()).not.toBe("");
    }

    const topNews = appState.newsQueue[0]!;
    expect(parseIngestCommand("入", 1)).toEqual({
      kind: "command",
      command: "ingest",
    });

    useIngestStore.getState().setExplanation("KP-09 主路径入库讲解");
    const ingestNews: NewsItem = {
      id: "phase15-ingest",
      category: "ai_news",
      title: "向量数据库 入门",
      summary: "向量检索与 embedding 索引实践。",
      sourceName: "Mock RSS",
      sourceUrl: "https://example.com/phase15-ingest",
      publishedAt: "2026-06-09T00:00:00.000Z",
    };

    const ingestResult = await applyIngestDecision("ingest", ingestNews, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });
    expect(ingestResult.event).toEqual({
      type: "ingestAnswer",
      command: "ingest",
    });

    const graphAfterIngest = await fixture.storage.loadGraph();
    const ingestedNode = graphAfterIngest.nodes.find(
      (node) => !node.archived && isConceptNode(node),
    );
    expect(ingestedNode).toBeDefined();

    const curationEntries = ingestResult.curationEntries ?? [];
    expect(curationEntries.length).toBeGreaterThan(0);
    const historyAfterCurate = await fixture.storage.listGraphHistory();
    for (const entry of curationEntries) {
      expect(historyAfterCurate.some((row) => row.id === entry.id)).toBe(true);
    }

    const undoTarget =
      curationEntries.find((entry) => entry.kind === "archive") ??
      curationEntries[0]!;
    const graphBeforeUndo = await fixture.storage.loadGraph();
    await useGraphHistoryStore.getState().load(fixture.storage);
    const restored = await useGraphHistoryStore
      .getState()
      .undo(fixture.storage, undoTarget.id);
    expect(restored).toEqual(undoTarget.before);
    const graphAfterUndo = await fixture.storage.loadGraph();
    expect(graphAfterUndo.nodes.filter((node) => !node.archived).length).toBe(
      undoTarget.before.nodes.filter((node) => !node.archived).length,
    );

    await useGraphHistoryStore.getState().load(fixture.storage);
    const sessionHistory = useGraphHistoryStore.getState().entries;
    const sessionHistoryIds = new Set(sessionHistory.map((row) => row.id));
    expect(sessionHistoryIds.size).toBeGreaterThan(0);

    const activeHistory = sessionHistory.filter((row) => !row.undone);
    const traces = await fixture.storage.listLearningTraces();
    const profile = await fixture.storage.loadUserProfile();
    const graph = await fixture.storage.loadGraphForDisplay();
    const reviewNow = new Date().toISOString();
    const weekRange = computeReviewWindow(null, reviewNow);
    const review = buildWeeklyBrainReview({
      graph,
      history: sessionHistory,
      traces,
      profile,
      weekRange,
      generatedAt: reviewNow,
    });

    for (const citation of review.citations.filter(
      (c) => c.type === "historyEntry",
    )) {
      expect(sessionHistoryIds.has(citation.id)).toBe(true);
    }

    if (activeHistory.length > 0) {
      const citedActive = activeHistory.some((entry) =>
        review.citations.some(
          (c) => c.type === "historyEntry" && c.id === entry.id,
        ),
      );
      expect(citedActive).toBe(true);
      const graphChanges = review.sections.find((s) => s.kind === "graph_changes");
      expect(graphChanges?.citationKeys.length).toBeGreaterThan(0);
      for (const entry of activeHistory) {
        expect(graphChanges?.citationKeys).toContain(
          citationKey("historyEntry", entry.id),
        );
      }
    } else {
      expect(graphBeforeUndo).not.toEqual(graphAfterUndo);
    }

    expect(topNews.id.startsWith("radar-wi-")).toBe(true);
    fixture.cleanup();
  });
});
