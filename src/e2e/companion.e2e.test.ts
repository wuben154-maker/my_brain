import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConversationConductor,
  type ConversationConductorDeps,
} from "@/conversation/ConversationConductor";
import { resolveRecalledMemoriesForTurn } from "@/conversation/contextTiers";
import {
  applyIngestDecision,
} from "@/conversation/ingestActions";
import {
  createFixtureContext,
  createIdleCompanionContext,
  FIXTURE_NEWS,
} from "@/conversation/mockConversationFixtures";
import { nextOnboardingAfterEvent, nextTurn } from "@/conversation/nextTurn";
import type { ConversationContext, ConversationState } from "@/conversation/types";
import { isConceptNode } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createTempStorage } from "@/invariants/testStorage";
import { planWalkthrough } from "@/lib/graphOutline";
import { parseIngestCommand } from "@/lib/parseIngestCommand";
import {
  distillAndPersistUserProfile,
  formatConversationTranscript,
  hasUserSpeech,
} from "@/lib/profileDistillation";
import { visibleGraph } from "@/lib/graphMutations";
import { INGEST_STAR_LIGHT_DURATION_MS } from "@/lib/ingestStarLight";
import { finalizeVoiceSession } from "@/lib/voiceSessionFinalize";
import { createAppProviders } from "@/providers";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
  skipLaunchSelfCheckSpeech,
} from "@/lib/runLaunchSequence";
import { createShowcaseCompanionContext } from "@/conversation/mockConversationFixtures";
import {
  resetShowcaseLaunchGuard,
  runShowcaseLaunchSequence,
} from "@/showcase/runShowcaseLaunchSequence";
import {
  runShowcaseCompanionScript,
  SHOWCASE_INGEST_NODE_ID,
} from "@/showcase/showcaseCompanionScript";
import {
  SHOWCASE_AUTO_CURATE_GOLDEN,
  SHOWCASE_BRIEFING_ITEMS,
} from "@/showcase/showcaseFixtures";
import { useGraphStore } from "@/stores/graphStore";
import { INITIAL_MIGRATION_SQL } from "@/storage/migrations";
import type { StorageProvider } from "@/storage/types";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useIngestStore } from "@/stores/ingestStore";
import { useProfileStore } from "@/stores/profileStore";

const storageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

const newsFetchSpy = vi.hoisted(() => ({ count: 0 }));

const mockNewsItems: NewsItem[] = [
  {
    id: "n-launch-e2e",
    category: "ai_news",
    title: "Launch e2e headline",
    summary: "Summary for launch smoke",
    sourceName: "Mock RSS",
    sourceUrl: "https://example.com/launch-e2e",
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
            newsFetchSpy.count += 1;
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

const stalePeerNode = {
  id: "stale-peer",
  title: "过时条目",
  intro: "stale peer for auto-curate",
  sourceUrl: null,
  archived: false,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-06-01T00:00:00.000Z",
};

function stubNavigatorForBoot(): void {
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn() },
    onLine: true,
  });
}

function resetCompanionStores(): void {
  useIngestStore.getState().reset();
  useGraphHistoryStore.getState().clear();
  useProfileStore.getState().reset();
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

function createConductorHarness(
  initialCtx: ConversationContext,
  onContextPatch?: ConversationConductorDeps["onContextPatch"],
) {
  let ctx = initialCtx;
  const voice = new MockVoiceProvider();
  const llm = createMockLlmProvider();
  const conductor = new ConversationConductor({
    llm,
    voice,
    getContext: () => ctx,
    onContextPatch: (patch) => {
      if (patch.onboarding) {
        ctx = { ...ctx, onboarding: patch.onboarding };
      }
      if (patch.newsCursor !== undefined) {
        ctx = { ...ctx, newsCursor: patch.newsCursor };
      }
      onContextPatch?.(patch);
    },
  });
  return { conductor, getContext: () => ctx, voice, llm };
}

describe("companion e2e (V7 mock smoke)", () => {
  beforeEach(() => {
    resetCompanionStores();
  });

  afterEach(() => {
    vi.useRealTimers();
    storageRef.current = null;
    resetLaunchSequenceGuard();
  });

  it("self_check → loading → companion with newsQueue populated", async () => {
    vi.useFakeTimers();
    stubNavigatorForBoot();

    const fixture = createTempStorage();
    storageRef.current = fixture.storage;

    const launchPromise = runLaunchSequence();
    await Promise.resolve();
    expect(useAppStore.getState().phase).toBe("self_check");

    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    const briefing = useBriefingStore.getState().todayItems;
    expect(state.phase).toBe("companion");
    expect(state.newsQueue).toHaveLength(3);
    expect(briefing).toHaveLength(3);
    expect(briefing.map((item) => item.worldItem.id)).toEqual(
      RADAR_RANKING_GOLDEN.top3Ids,
    );
    expect(state.newsQueue.every((item) => item.id.startsWith("radar-wi-"))).toBe(true);
    expect(state.selfChecks.some((c) => c.id === "mic")).toBe(true);
    expect(state.selfChecks.some((c) => c.id === "storage")).toBe(true);
    expect(state.storage).toBe(fixture.storage);

    fixture.cleanup();
  });

  it("cold-start short path → briefing → ingest「入」→ node persisted", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const ctx = createFixtureContext({
      onboarding: { active: true, step: "first_star", interestRounds: 2 },
    });
    const { conductor } = createConductorHarness(ctx);

    await conductor.start({ speak: false });
    await conductor.dispatch(
      { type: "newsAvailable", queueLength: FIXTURE_NEWS.length },
      { speak: false },
    );
    expect(conductor.getState()).toBe("ingest_decision");

    useIngestStore.getState().setExplanation("冷启动首颗星讲解");
    const news = FIXTURE_NEWS[0]!;
    const result = await applyIngestDecision("ingest", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });

    expect(result.event).toEqual({
      type: "ingestAnswer",
      command: "ingest",
    });
    const graph = visibleGraph(await fixture.storage.loadGraph());
    expect(graph.nodes).toHaveLength(1);
    const first = graph.nodes[0];
    expect(first && isConceptNode(first) && first.sourceUrl).toBe(news.sourceUrl);
    expect(useIngestStore.getState().ingestedIds).toContain(news.id);

    const onboarding = nextOnboardingAfterEvent(ctx, {
      type: "ingestAnswer",
      command: "ingest",
    });
    expect(onboarding.active).toBe(false);
    expect(onboarding.step).toBe("done");

    fixture.cleanup();
  });

  it("post-ingest autoCurate writes graph_history entries (undoable)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));

    const fixture = createTempStorage();
    await fixture.storage.init();
    await fixture.storage.saveConcept(stalePeerNode);

    useIngestStore.getState().setExplanation("入库讲解");
    const news: NewsItem = {
      id: "auto-curate-e2e",
      category: "ai_news",
      title: "上下文窗口扩展",
      summary: "长文档问答更稳。",
      sourceName: "Mock RSS",
      sourceUrl: "https://example.com/auto-curate-e2e",
      publishedAt: "2026-06-02T00:00:00.000Z",
    };

    const result = await applyIngestDecision("ingest", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });

    expect(result.curationEntries?.length).toBeGreaterThan(0);
    const history = await fixture.storage.listGraphHistory();
    expect(history.length).toBeGreaterThan(0);
    for (const entry of result.curationEntries ?? []) {
      expect(history.some((row) => row.id === entry.id)).toBe(true);
      expect(entry.before).toBeDefined();
      expect(entry.after).toBeDefined();
    }

    fixture.cleanup();
  });

  it("planWalkthrough returns steps after ingest", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();
    useIngestStore.getState().setExplanation("e2e intro");

    const news = FIXTURE_NEWS[1]!;
    await applyIngestDecision("ingest", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });

    const graph = visibleGraph(await fixture.storage.loadGraph());
    expect(graph.nodes.length).toBeGreaterThan(0);
    const nodeId = graph.nodes[0]!.id;
    const steps = planWalkthrough(news.title, graph);
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps).toContain(nodeId);

    fixture.cleanup();
  });

  it("graph history undo restores pre-curation state", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));

    const fixture = createTempStorage();
    await fixture.storage.init();
    await fixture.storage.saveConcept(stalePeerNode);

    useIngestStore.getState().setExplanation("入库讲解");
    const news: NewsItem = {
      id: "undo-e2e",
      category: "ai_news",
      title: "上下文窗口扩展",
      summary: "长文档问答更稳。",
      sourceName: "Mock RSS",
      sourceUrl: "https://example.com/undo-e2e",
      publishedAt: "2026-06-02T00:00:00.000Z",
    };

    const result = await applyIngestDecision("ingest", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });
    const curationEntries = result.curationEntries ?? [];
    expect(curationEntries.length).toBeGreaterThan(0);
    const curationEntry =
      curationEntries.find((entry) => entry.kind === "archive") ??
      curationEntries[0]!;

    const graphBeforeUndo = await fixture.storage.loadGraph();
    expect(JSON.stringify(graphBeforeUndo)).not.toEqual(
      JSON.stringify(curationEntry.before),
    );

    await useGraphHistoryStore.getState().load(fixture.storage);
    const restored = await useGraphHistoryStore
      .getState()
      .undo(fixture.storage, curationEntry.id);

    expect(restored).toEqual(curationEntry.before);
    const afterUndo = await fixture.storage.loadGraph();
    expect(afterUndo.nodes.filter((node) => !node.archived).length).toBe(
      curationEntry.before.nodes.filter((node) => !node.archived).length,
    );
    expect(afterUndo.edges).toEqual(curationEntry.before.edges);

    fixture.cleanup();
  });

  it("ambiguous ingest answer reprompts without auto-skip", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const ctx = createIdleCompanionContext();
    const { conductor } = createConductorHarness(ctx);

    await conductor.start({ speak: false });
    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );
    expect(conductor.getState()).toBe("ingest_decision");

    const parsed = parseIngestCommand("嗯", 1);
    expect(parsed).toEqual({ kind: "reprompt" });

    const reprompt = await conductor.dispatch(
      { type: "ingestReprompt" },
      { speak: false },
    );
    expect(reprompt.expect).toBe("ingest");
    expect(reprompt.say).toMatch(/入库/);
    expect(conductor.getState()).toBe("ingest_decision");

    const graph = await fixture.storage.loadGraph();
    expect(graph.nodes).toHaveLength(0);
    expect(useIngestStore.getState().skippedIds).toEqual([]);
    expect(useIngestStore.getState().ingestedIds).toEqual([]);

    fixture.cleanup();
  });

  it("idle companion small talk then newsAvailable reaches ingest_decision", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const ctx = createIdleCompanionContext();
    const { conductor } = createConductorHarness(ctx);

    await conductor.start({ speak: false });
    expect(conductor.getState()).toBe("idle_chat");

    const chatTurn = await conductor.dispatch(
      { type: "userSpeak", transcript: "你好，随便聊聊" },
      { speak: false },
    );
    expect(conductor.getState()).toBe("small_talk");
    expect(chatTurn.say.length).toBeGreaterThan(0);

    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );
    expect(conductor.getState()).toBe("ingest_decision");

    const graph = await fixture.storage.loadGraph();
    expect(graph.nodes).toHaveLength(0);

    fixture.cleanup();
  });

  it("post-ingest topicRequest populates walkthroughNodeIds for graph highlight", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();
    useIngestStore.getState().setExplanation("串讲高亮 e2e");

    const news = FIXTURE_NEWS[0]!;
    await applyIngestDecision("ingest", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });

    const graph = visibleGraph(await fixture.storage.loadGraph());
    expect(graph.nodes.length).toBeGreaterThan(0);
    const nodeId = graph.nodes[0]!.id;
    const topic = graph.nodes[0]!.title;

    const ctx = createIdleCompanionContext({ graph });
    const { conductor } = createConductorHarness(ctx);
    await conductor.start({ speak: false });

    const turn = await conductor.dispatch(
      { type: "topicRequest", topic },
      { speak: false },
    );

    expect(conductor.getState()).toBe("teaching");
    expect(turn.highlightNodeIds).toContain(nodeId);
    expect(conductor.getWorkingContext().walkthroughNodeIds).toContain(nodeId);

    fixture.cleanup();
  });

  it("persona change via profile store alters conductor briefing voice", async () => {
    const mentorCtx = createIdleCompanionContext({
      profile: { ...DEFAULT_USER_PROFILE, persona: "mentor" },
      personaId: "mentor",
    });
    const geekCtx = createIdleCompanionContext({
      profile: { ...DEFAULT_USER_PROFILE, persona: "geek" },
      personaId: "geek",
    });

    const { conductor: mentorConductor } = createConductorHarness(mentorCtx);
    const mentorTurn = await mentorConductor.start({ speak: false });

    useProfileStore.getState().setProfile(geekCtx.profile);
    const { conductor: geekConductor } = createConductorHarness(geekCtx);
    const geekTurn = await geekConductor.start({ speak: false });

    expect(mentorTurn?.say.length).toBeGreaterThan(0);
    expect(geekTurn?.say.length).toBeGreaterThan(0);
    expect(mentorTurn?.say).not.toBe(geekTurn?.say);
    expect(useProfileStore.getState().profile.persona).toBe("geek");

    const llm = createMockLlmProvider();
    const mentorBriefing = await nextTurn(
      "idle_chat",
      { type: "newsAvailable", queueLength: FIXTURE_NEWS.length },
      mentorCtx,
      llm,
    );
    const geekBriefing = await nextTurn(
      "idle_chat",
      { type: "newsAvailable", queueLength: FIXTURE_NEWS.length },
      geekCtx,
      llm,
    );
    expect(mentorBriefing.say).not.toBe(geekBriefing.say);
  });

  it("tiered recall on second userSpeak recalls memory without graph mutation", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        text: "用户偏好简洁解释 RAG 检索增强",
        kind: "fact",
        timestamp: Date.now(),
      },
    ]);

    const recallMemories = vi.fn(
      async (input: { query: string; state: ConversationState }) =>
        resolveRecalledMemoriesForTurn(memory, input.query, input.state),
    );

    const ctx = createIdleCompanionContext();
    const conductor = new ConversationConductor({
      llm: createMockLlmProvider(),
      voice: new MockVoiceProvider(),
      getContext: () => ctx,
      recallMemories,
    });

    const graphBefore = await fixture.storage.loadGraph();
    await conductor.start({ speak: false });
    recallMemories.mockClear();

    await conductor.dispatch(
      { type: "userSpeak", transcript: "你好" },
      { speak: false },
    );
    const tailAfterFirst = conductor.getWorkingContext().transcriptTail;
    expect(tailAfterFirst).toContain("你好");

    await conductor.dispatch(
      { type: "userSpeak", transcript: "讲讲 RAG 检索" },
      { speak: false },
    );

    expect(recallMemories).toHaveBeenCalledTimes(2);
    expect(recallMemories).toHaveBeenNthCalledWith(2, {
      query: "讲讲 RAG 检索",
      state: expect.any(String),
    });
    expect(conductor.getWorkingContext().transcriptTail.length).toBeGreaterThan(
      tailAfterFirst.length,
    );

    const graphAfter = await fixture.storage.loadGraph();
    expect(graphAfter.nodes).toEqual(graphBefore.nodes);
    expect(graphAfter.edges).toEqual(graphBefore.edges);

    fixture.cleanup();
  });

  it("profile distillation after small-talk voice session persists profile not raw transcript", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();
    const llm = createMockLlmProvider();

    const smallTalkLines = [
      {
        role: "user" as const,
        text: "今天天气不错，我最近在看 Agent 框架",
        final: true,
      },
      {
        role: "assistant" as const,
        text: "嗯，有什么想深入聊的吗？",
        final: true,
      },
    ];

    let cleared = false;
    await finalizeVoiceSession({
      transcripts: smallTalkLines,
      disconnectVoice: async () => {},
      distillProfile: async (lines) => {
        if (!hasUserSpeech(lines)) {
          return true;
        }
        const transcript = formatConversationTranscript(lines);
        await distillAndPersistUserProfile(
          fixture.storage,
          llm,
          transcript,
          DEFAULT_USER_PROFILE,
        );
        return true;
      },
      clearTranscripts: () => {
        cleared = true;
      },
    });

    expect(cleared).toBe(true);
    const profile = await fixture.storage.loadUserProfile();
    expect(profile.interests.length).toBeGreaterThan(0);
    expect(JSON.stringify(profile)).not.toContain("嗯，有什么想深入聊的吗");

    const sql = INITIAL_MIGRATION_SQL.toLowerCase();
    expect(sql).not.toMatch(/\btranscript\b/);
    expect(sql).not.toMatch(/\baudio\b/);

    const db = new Database(fixture.dbPath, { readonly: true });
    try {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      expect(tables.map((row) => row.name)).not.toContain("transcripts");
      expect(tables.map((row) => row.name)).not.toContain("transcript");

      const dump = db
        .prepare(
          "SELECT key, value FROM user_profile UNION ALL SELECT 'concepts', title FROM concepts",
        )
        .all() as { key: string; value: string }[];
      const serialized = JSON.stringify(dump);
      expect(serialized).not.toContain("嗯，有什么想深入聊的吗");
      expect(serialized).not.toContain("今天天气不错");
    } finally {
      db.close();
    }

    fixture.cleanup();
  });

  it("barge-in userInterrupt during speak calls voice.interrupt and returns to listening", async () => {
    vi.useFakeTimers();

    const fixture = createTempStorage();
    await fixture.storage.init();

    const ctx = createIdleCompanionContext();
    const voice = new MockVoiceProvider();
    const connectPromise = voice.connect({ apiKey: "" });
    await vi.advanceTimersByTimeAsync(550);
    await connectPromise;
    // Leave auto-greeting timer pending — runAllTimersAsync would drain a long stream and stall barge-in.

    const conductor = new ConversationConductor({
      llm: createMockLlmProvider(),
      voice,
      getContext: () => ctx,
    });
    const interruptSpy = vi.spyOn(voice, "interrupt");

    await conductor.start({ speak: false });
    expect(voice.getState()).toBe("listening");

    const speakPromise = voice.speak("助手回复".repeat(40), { interruptible: true });
    await vi.advanceTimersByTimeAsync(30);
    expect(voice.getState()).toBe("speaking");

    await conductor.dispatch({ type: "userInterrupt" }, { speak: false });

    expect(interruptSpy).toHaveBeenCalled();
    expect(voice.getState()).toBe("listening");
    expect(conductor.getState()).toBe("idle_chat");

    await speakPromise;

    fixture.cleanup();
  });

  it("ingest skip via parseIngestCommand 不要 keeps graph empty and updates skippedIds", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const news = FIXTURE_NEWS[0]!;
    expect(parseIngestCommand("不要", 1)).toEqual({
      kind: "command",
      command: "skip",
    });

    const result = await applyIngestDecision("skip", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });

    expect(result.event).toEqual({
      type: "ingestAnswer",
      command: "skip",
    });
    expect(useIngestStore.getState().skippedIds).toContain(news.id);
    expect(useIngestStore.getState().ingestedIds).toEqual([]);

    const graph = await fixture.storage.loadGraph();
    expect(graph.nodes).toHaveLength(0);

    fixture.cleanup();
  });

  it("reprompt then second ambiguous answer skips without auto-ingest", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const ctx = createIdleCompanionContext();
    const { conductor } = createConductorHarness(ctx);
    const news = ctx.newsQueue[ctx.newsCursor]!;

    await conductor.start({ speak: false });
    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );
    expect(conductor.getState()).toBe("ingest_decision");

    expect(parseIngestCommand("嗯", 1)).toEqual({ kind: "reprompt" });
    useIngestStore.getState().setIngestParseAttempt(2);
    await conductor.dispatch({ type: "ingestReprompt" }, { speak: false });
    expect(conductor.getState()).toBe("ingest_decision");

    expect(parseIngestCommand("随便", 2)).toEqual({
      kind: "command",
      command: "skip",
    });

    const skipResult = await applyIngestDecision("skip", news, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });
    await conductor.dispatch(skipResult.event!, { speak: false });

    expect(useIngestStore.getState().skippedIds).toContain(news.id);
    expect(useIngestStore.getState().ingestedIds).toEqual([]);
    const graph = await fixture.storage.loadGraph();
    expect(graph.nodes).toHaveLength(0);

    fixture.cleanup();
  });

  it("skipLaunchSelfCheckSpeech during self_check continues boot to companion", async () => {
    vi.useFakeTimers();
    stubNavigatorForBoot();

    const fixture = createTempStorage();
    storageRef.current = fixture.storage;

    const launchPromise = runLaunchSequence();
    await Promise.resolve();
    expect(useAppStore.getState().phase).toBe("self_check");

    await vi.advanceTimersByTimeAsync(900);
    skipLaunchSelfCheckSpeech();
    await vi.runAllTimersAsync();
    await launchPromise;

    const state = useAppStore.getState();
    expect(state.phase).toBe("companion");
    expect(state.bootLogs.join("\n")).toContain("自检播报已跳过");
    expect(state.newsQueue.length).toBeGreaterThan(0);

    fixture.cleanup();
  });

  it("voice timbre change via createAppProviders setVoice updates getVoice", () => {
    const providers = createAppProviders({ openAiApiKey: "" });

    expect(providers.voice.getVoice()).toBe("alloy");
    providers.voice.setVoice("nova");
    expect(providers.voice.getVoice()).toBe("nova");
  });

  it("memory boundary: multi-turn recall invokes recallMemories without remember() graph writes", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        text: "用户偏好简洁解释 RAG 检索增强",
        kind: "fact",
        timestamp: Date.now(),
      },
    ]);
    const rememberSpy = vi.spyOn(memory, "remember");

    const recallMemories = vi.fn(
      async (input: { query: string; state: ConversationState }) =>
        resolveRecalledMemoriesForTurn(memory, input.query, input.state),
    );

    const ctx = createIdleCompanionContext();
    const conductor = new ConversationConductor({
      llm: createMockLlmProvider(),
      voice: new MockVoiceProvider(),
      getContext: () => ctx,
      recallMemories,
    });

    const graphBefore = await fixture.storage.loadGraph();
    await conductor.start({ speak: false });
    rememberSpy.mockClear();

    await conductor.dispatch(
      { type: "userSpeak", transcript: "你好" },
      { speak: false },
    );
    await conductor.dispatch(
      { type: "userSpeak", transcript: "讲讲 RAG 检索" },
      { speak: false },
    );
    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );

    expect(recallMemories).toHaveBeenCalled();
    expect(rememberSpy).not.toHaveBeenCalled();

    const graphAfter = await fixture.storage.loadGraph();
    expect(graphAfter.nodes).toEqual(graphBefore.nodes);
    expect(graphAfter.edges).toEqual(graphBefore.edges);

    fixture.cleanup();
  });
});

describe("companion e2e showcase core loop", () => {
  beforeEach(() => {
    resetCompanionStores();
    newsFetchSpy.count = 0;
    resetShowcaseLaunchGuard();
    process.env.VITE_SHOWCASE_DEMO = "1";
  });

  afterEach(() => {
    delete process.env.VITE_SHOWCASE_DEMO;
    resetShowcaseLaunchGuard();
  });

  it("showcase core loop: launch fixtures → skip/elaborate/ingest → star-light + golden link", async () => {
    vi.useFakeTimers();
    stubNavigatorForBoot();

    const fixture = createTempStorage();
    storageRef.current = fixture.storage;

    const launchPromise = runShowcaseLaunchSequence();
    await vi.runAllTimersAsync();
    await launchPromise;
    expect(useAppStore.getState().phase).toBe("companion");
    expect(useAppStore.getState().newsQueue).toHaveLength(3);
    expect(useAppStore.getState().newsQueue.map((n) => n.id)).toEqual(
      SHOWCASE_BRIEFING_ITEMS.map((n) => n.id),
    );
    expect(newsFetchSpy.count).toBe(0);

    const storage = useAppStore.getState().storage!;
    const providers = useAppStore.getState().providers!;

    let ctx = createShowcaseCompanionContext({
      newsQueue: useAppStore.getState().newsQueue,
      graph: {
        nodes: useGraphStore.getState().nodes,
        edges: useGraphStore.getState().edges,
      },
    });

    const { conductor } = createConductorHarness(ctx, (patch) => {
      if (patch.newsCursor !== undefined) {
        ctx = { ...ctx, newsCursor: patch.newsCursor };
      }
    });

    const scriptResult = await runShowcaseCompanionScript({
      conductor,
      getContext: () => ctx,
      ingestDeps: {
        storage,
        llm: providers.llm,
        profile: ctx.profile,
      },
      speak: false,
    });

    expect(scriptResult.skippedIds).toEqual(
      expect.arrayContaining(["showcase-brief-1", "showcase-brief-2"]),
    );
    expect(scriptResult.ingestedIds).toContain("showcase-brief-3");
    expect(scriptResult.peakElaborationDepth).toBeGreaterThanOrEqual(1);
    expect(conductor.getShowcaseBriefingStep()).toBe("done");

    expect(useGraphStore.getState().focusNodeId).toBe(SHOWCASE_INGEST_NODE_ID);
    await vi.advanceTimersByTimeAsync(INGEST_STAR_LIGHT_DURATION_MS);
    expect(useGraphStore.getState().focusNodeId).toBeNull();

    const fullGraph = await storage.loadGraphForDisplay();
    const ingested = fullGraph.nodes.find(
      (node) => node.id === SHOWCASE_INGEST_NODE_ID,
    );
    expect(
      ingested && isConceptNode(ingested) ? ingested.sourceUrl : null,
    ).toBe("https://example.com/graphiti");

    const goldenEdge = fullGraph.edges.find(
      (edge) =>
        edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&
        edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
    );
    expect(goldenEdge).toBeDefined();

    const history = await storage.listGraphHistory();
    expect(history.some((entry) => entry.kind === "link")).toBe(true);

    fixture.cleanup();
  });
});
