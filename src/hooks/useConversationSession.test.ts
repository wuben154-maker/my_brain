/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConversationSession } from "@/hooks/useConversationSession";
import { createAppProviders } from "@/providers";
import { useAppStore } from "@/stores/appStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useGraphStore } from "@/stores/graphStore";

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

  it("primes companion opening turn without voice connected", async () => {
    const providers = createAppProviders({ openAiApiKey: "" });
    useAppStore.setState({ providers, newsQueue: [] });

    const hook = renderHook(() =>
      useConversationSession({ voiceConnected: false }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(hook.result.current.turns.some((t) => t.role === "assistant")).toBe(
      true,
    );
    expect(hook.result.current.isActive).toBe(true);
  });

  it("onUserInterrupt routes through conductor to voice.interrupt", async () => {
    const providers = createAppProviders({ openAiApiKey: "" });
    const interruptSpy = vi.spyOn(providers.voice, "interrupt");
    useAppStore.setState({ providers });

    const sessionHook = renderHook(() =>
      useConversationSession({ voiceConnected: false }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      sessionHook.result.current.onUserInterrupt();
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
    useAppStore.setState({ providers });

    const sessionHook = renderHook(() =>
      useConversationSession({ voiceConnected: false }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      sessionHook.result.current.onUserInterrupt();
      await Promise.resolve();
    });

    expect(useGraphStore.getState().highlightedNodeIds).toEqual([]);
    expect(useGraphStore.getState().highlightedEdgeIds).toEqual([]);
  });
});
