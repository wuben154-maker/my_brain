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

  assertShowcaseIngestOutcome,

  runShowcaseCompanionScript,

  SHOWCASE_INGEST_NODE_ID,

} from "@/showcase/showcaseCompanionScript";

import {

  SHOWCASE_AUTO_CURATE_GOLDEN,

  SHOWCASE_GRAPH_SNAPSHOT,

} from "@/showcase/showcaseFixtures";

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

          fetchAll: async () => [],

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



describe("showcaseUndoReport integration", () => {

  beforeEach(() => {

    resetHarnessStores();

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



  it("A2 loop → undo link → ingest node preserved, archive regression", async () => {

    vi.useFakeTimers();

    stubNavigatorForBoot();



    const fixture = createTempStorage();

    storageRef.current = fixture.storage;



    const launchPromise = runShowcaseLaunchSequence();

    await vi.runAllTimersAsync();

    await launchPromise;



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



    const historyEntries = useGraphHistoryStore.getState().entries;

    expect(historyEntries.length).toBeGreaterThanOrEqual(1);

    const linkEntry = historyEntries.find((entry) => entry.kind === "link");

    expect(linkEntry).toBeTruthy();

    expect(linkEntry?.reasonCode).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.reasonCode);

    expect(linkEntry?.reasonDetail).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.reasonDetail);

    expect(linkEntry?.summary).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.summary);

    expect(linkEntry?.affectedNodeIds).toHaveLength(2);

    expect(useGraphHistoryStore.getState().reportEntryId).toBe(linkEntry?.id);



    const fullBeforeUndo = await storage!.loadGraph();

    const goldenEdge = fullBeforeUndo.edges.find(

      (edge) =>

        edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&

        edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,

    );

    expect(goldenEdge).toBeTruthy();



    const restored = await useGraphHistoryStore

      .getState()

      .undo(storage!, linkEntry!.id);

    expect(restored).toBeTruthy();



    const fullAfterUndo = await storage!.loadGraph();

    const removedEdge = fullAfterUndo.edges.find(

      (edge) =>

        edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&

        edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,

    );

    expect(removedEdge).toBeUndefined();



    const ingestedNode = fullAfterUndo.nodes.find(

      (node) => node.id === SHOWCASE_INGEST_NODE_ID,

    );

    expect(ingestedNode).toBeTruthy();

    expect(ingestedNode?.archived).toBe(false);



    const fullDisplay = await storage!.loadGraphForDisplay();
    const bert = fullDisplay.nodes.find((node) => node.id === "demo-bert");
    expect(bert?.archived).toBe(true);



    const storeEntry = useGraphHistoryStore

      .getState()

      .entries.find((row) => row.id === linkEntry!.id);

    expect(storeEntry?.undone).toBe(true);



    const display = visibleGraph(fullAfterUndo);

    expect(display.nodes.some((node) => node.id === SHOWCASE_INGEST_NODE_ID)).toBe(

      true,

    );

    expect(

      display.nodes.some((node) => node.id === SHOWCASE_GRAPH_SNAPSHOT.nodes[0]?.id),

    ).toBe(true);



    fixture.cleanup();

  });

});


