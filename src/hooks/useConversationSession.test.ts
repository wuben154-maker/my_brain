/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ingestActions from "@/conversation/ingestActions";
import { FIXTURE_NEWS } from "@/conversation/mockConversationFixtures";
import { useConversationSession } from "@/hooks/useConversationSession";
import { createTempStorage } from "@/invariants/testStorage";
import { createAppProviders } from "@/providers";
import { useAppStore } from "@/stores/appStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useGraphStore } from "@/stores/graphStore";
import { useIngestStore } from "@/stores/ingestStore";

describe("useConversationSession voice interrupt wiring", () => {
  beforeEach(() => {
    useConversationStore.getState().reset();
    useAppStore.setState({
      phase: "companion",
      newsQueue: [],
      providers: null,
      storage: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("speaks companion opening turn once after voice connects", async () => {
    const providers = createAppProviders({ openAiApiKey: "" });
    const speakSpy = vi.spyOn(providers.voice, "speak");
    useAppStore.setState({ providers, newsQueue: [] });

    const hook = renderHook(
      ({ connected }: { connected: boolean }) =>
        useConversationSession({ voiceConnected: connected }),
      { initialProps: { connected: false } },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(speakSpy).not.toHaveBeenCalled();

    hook.rerender({ connected: true });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hook.result.current.turns.some((t) => t.role === "assistant")).toBe(
      true,
    );
    expect(speakSpy).toHaveBeenCalledTimes(1);
    speakSpy.mockRestore();
  });

  it("starts proactive session when providers load after companion phase", async () => {
    useAppStore.setState({ phase: "companion", providers: null, newsQueue: [] });
    const speakSpy = vi.fn().mockResolvedValue(undefined);

    renderHook(
      ({ connected }: { connected: boolean }) =>
        useConversationSession({ voiceConnected: connected }),
      { initialProps: { connected: true } },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(speakSpy).not.toHaveBeenCalled();

    const providers = createAppProviders({ openAiApiKey: "" });
    vi.spyOn(providers.voice, "speak").mockImplementation(speakSpy);
    useAppStore.setState({ providers });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(useConversationStore.getState().companionOpened).toBe(true);
    expect(
      useConversationStore.getState().turns.filter((t) => t.role === "assistant"),
    ).toHaveLength(1);
  });

  it("onUserInterrupt routes through conductor to voice.interrupt", async () => {
    const providers = createAppProviders({ openAiApiKey: "" });
    vi.spyOn(providers.voice, "speak").mockResolvedValue(undefined);
    const interruptSpy = vi.spyOn(providers.voice, "interrupt");
    useAppStore.setState({ providers });

    const sessionHook = renderHook(() =>
      useConversationSession({ voiceConnected: false }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      sessionHook.result.current.onUserInterrupt();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(interruptSpy).toHaveBeenCalled();
  });

  it("onUserInterrupt stops walkthrough highlights", async () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n-rag",
          title: "RAG",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
      highlightedNodeIds: ["n-rag"],
      highlightedEdgeIds: [],
    });
    const providers = createAppProviders({ openAiApiKey: "" });
    vi.spyOn(providers.voice, "speak").mockResolvedValue(undefined);
    useAppStore.setState({ providers });

    const sessionHook = renderHook(() =>
      useConversationSession({ voiceConnected: false }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      sessionHook.result.current.onUserInterrupt();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useGraphStore.getState().highlightedNodeIds).toEqual([]);
    expect(useGraphStore.getState().highlightedEdgeIds).toEqual([]);
  });
});

describe("useConversationSession ingest parse attempt (V3)", () => {
  beforeEach(() => {
    useConversationStore.getState().reset();
    useIngestStore.getState().reset();
    useAppStore.setState({
      phase: "companion",
      newsQueue: [],
      providers: null,
      storage: null,
    });
  });

  it("ambiguous ingest answer sets ingestParseAttempt to 2 and reprompts", async () => {
    const { storage, cleanup } = createTempStorage();
    const setAttemptSpy = vi.spyOn(
      useIngestStore.getState(),
      "setIngestParseAttempt",
    );
    try {
      await storage.init();
      const providers = createAppProviders({ openAiApiKey: "" });
      vi.spyOn(providers.voice, "speak").mockResolvedValue(undefined);
      useAppStore.setState({
        phase: "companion",
        newsQueue: FIXTURE_NEWS,
        providers,
        storage,
      });
      useIngestStore.getState().setCursor(0);
      useIngestStore.getState().setActiveNewsId(FIXTURE_NEWS[0]!.id);
      useIngestStore.getState().resetIngestParseAttempt();

      const hook = renderHook(() =>
        useConversationSession({ voiceConnected: false }),
      );

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      useConversationStore.setState({
        currentState: "ingest_decision",
        newsCursor: 0,
      });

      const assistantTurnsBefore = useConversationStore
        .getState()
        .turns.filter((t) => t.role === "assistant").length;

      await act(async () => {
        hook.result.current.onUserTranscript("嗯", true);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(setAttemptSpy).toHaveBeenCalledWith(2);
      expect(useConversationStore.getState().currentState).toBe(
        "ingest_decision",
      );
      expect(useIngestStore.getState().ingestedIds).toEqual([]);
      const assistantTurns = useConversationStore
        .getState()
        .turns.filter((t) => t.role === "assistant");
      expect(assistantTurns.length).toBeGreaterThan(assistantTurnsBefore);
      expect(assistantTurns.some((t) => /入库/.test(t.text))).toBe(true);
    } finally {
      setAttemptSpy.mockRestore();
      cleanup();
    }
  });

  it("ingest persist failure reprompts instead of auto skip", async () => {
    const { storage, cleanup } = createTempStorage();
    const applySpy = vi
      .spyOn(ingestActions, "applyIngestDecision")
      .mockRejectedValue(new Error("mock persist failed"));
    try {
      await storage.init();
      const providers = createAppProviders({ openAiApiKey: "" });
      vi.spyOn(providers.voice, "speak").mockResolvedValue(undefined);
      useAppStore.setState({
        phase: "companion",
        newsQueue: FIXTURE_NEWS,
        providers,
        storage,
      });
      useIngestStore.getState().setCursor(0);
      useIngestStore.getState().setActiveNewsId(FIXTURE_NEWS[0]!.id);

      const hook = renderHook(() => useConversationSession());

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      useConversationStore.setState({
        currentState: "ingest_decision",
        newsCursor: 0,
      });

      await act(async () => {
        hook.result.current.onUserTranscript("入", true);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(applySpy).toHaveBeenCalled();
      expect(useConversationStore.getState().currentState).toBe(
        "ingest_decision",
      );
      expect(useIngestStore.getState().ingestedIds).toEqual([]);
      expect(useIngestStore.getState().errorMessage).toContain(
        "mock persist failed",
      );
      const assistantTurns = useConversationStore
        .getState()
        .turns.filter((t) => t.role === "assistant");
      const lastAssistant = assistantTurns[assistantTurns.length - 1];
      expect(lastAssistant?.text).toMatch(/入库没成功|入库/);
    } finally {
      applySpy.mockRestore();
      cleanup();
    }
  });
});
