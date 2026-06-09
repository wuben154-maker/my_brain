/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationConductor } from "@/conversation/ConversationConductor";
import { createShowcaseCompanionContext } from "@/conversation/mockConversationFixtures";
import type { ConversationContext } from "@/conversation/types";
import { createTempStorage } from "@/invariants/testStorage";
import { visibleGraph } from "@/lib/graphMutations";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import {
  resetShowcaseLaunchGuard,
  runShowcaseLaunchSequence,
} from "@/showcase/runShowcaseLaunchSequence";
import {
  INGEST_STAR_LIGHT_DURATION_MS,
} from "@/lib/ingestStarLight";
import {
  assertShowcaseIngestOutcome,
  runShowcaseCompanionScript,
  SHOWCASE_INGEST_NODE_ID,
} from "@/showcase/showcaseCompanionScript";
import { SHOWCASE_AUTO_CURATE_GOLDEN } from "@/showcase/showcaseFixtures";
import { useAppStore } from "@/stores/appStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useGraphStore } from "@/stores/graphStore";
import { useIngestStore } from "@/stores/ingestStore";
import { useProposalStore } from "@/stores/proposalStore";
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

function resetHarnessStores(): void {
  useIngestStore.getState().reset();
  useGraphHistoryStore.getState().clear();
  useProposalStore.setState({ pending: [] });
  useConversationStore.getState().reset();
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

describe("showcaseCoreLoop integration", () => {
  beforeEach(() => {
    resetHarnessStores();
    newsFetchSpy.count = 0;
    resetShowcaseLaunchGuard();
    window.location.search = "?showcase=1";
    process.env.VITE_SHOWCASE_DEMO = "1";
  });

  afterEach(() => {
    vi.useRealTimers();
    storageRef.current = null;
    window.history.replaceState({}, "", "/");
    delete process.env.VITE_SHOWCASE_DEMO;
    resetShowcaseLaunchGuard();
  });

  it("launch → companion script → graph ingest + golden auto-curate link", async () => {
    vi.useFakeTimers();
    stubNavigatorForBoot();

    const fixture = createTempStorage();
    storageRef.current = fixture.storage;

    const launchPromise = runShowcaseLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;
    expect(useAppStore.getState().phase).toBe("companion");
    expect(newsFetchSpy.count).toBe(0);

    const storage = useAppStore.getState().storage;
    const providers = useAppStore.getState().providers;
    expect(storage).toBeTruthy();
    expect(providers).toBeTruthy();

    let ctx: ConversationContext = createShowcaseCompanionContext({
      newsQueue: useAppStore.getState().newsQueue,
      graph: {
        nodes: useGraphStore.getState().nodes,
        edges: useGraphStore.getState().edges,
      },
    });

    const voice = new MockVoiceProvider();
    const llm = providers!.llm;
    const conductor = new ConversationConductor({
      llm,
      voice,
      getContext: () => ctx,
      onContextPatch: (patch) => {
        if (patch.newsCursor !== undefined) {
          ctx = { ...ctx, newsCursor: patch.newsCursor };
          useConversationStore.getState().setNewsCursor(patch.newsCursor);
        }
      },
    });

    await runShowcaseCompanionScript({
      conductor,
      getContext: () => ctx,
      ingestDeps: {
        storage: storage!,
        llm,
        profile: ctx.profile,
      },
      speak: false,
    });

    assertShowcaseIngestOutcome();

    expect(useGraphStore.getState().focusNodeId).toBe(SHOWCASE_INGEST_NODE_ID);
    expect(useGraphStore.getState().highlightedNodeIds).toContain(
      SHOWCASE_INGEST_NODE_ID,
    );
    await vi.advanceTimersByTimeAsync(INGEST_STAR_LIGHT_DURATION_MS);
    expect(useGraphStore.getState().focusNodeId).toBeNull();

    const fullGraph = await storage!.loadGraphForDisplay();
    expect(fullGraph.nodes).toHaveLength(8);
    const visible = visibleGraph(fullGraph);
    expect(visible.nodes).toHaveLength(7);

    const ingested = fullGraph.nodes.find(
      (node) => node.id === SHOWCASE_INGEST_NODE_ID,
    );
    expect(ingested?.sourceUrl).toBe("https://example.com/graphiti");

    const goldenEdge = fullGraph.edges.find(
      (edge) =>
        edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&
        edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
    );
    expect(goldenEdge?.relationType).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.relationType);

    const history = await storage!.listGraphHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    const linkEntry = history.find((entry) => entry.kind === "link");
    expect(linkEntry?.reasonCode).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.reasonCode);

    expect(useProposalStore.getState().pending).toHaveLength(0);

    fixture.cleanup();
  });
});
