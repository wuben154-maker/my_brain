/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  createInitialConversationState,
  enterProvisionalPending,
  selectAdaptiveSignal,
} from "@my-brain/core";
import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

import { useConversationSession } from "./useConversationSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("useConversationSession — Conversation ingest", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      conversation: createInitialConversationState(),
      signals: [],
      hasApiKey: false,
    });
    useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
  });

  it("explain_more uses mock fallback without API key and does not ingest", () => {
    useMobileAppStore.setState({
      conversation: selectAdaptiveSignal(createInitialConversationState(), "sig-rag"),
      signals: [
        {
          sourceType: "radar",
          userModeFit: "tech_tracker",
          freshness: 0.9,
          evidenceRefs: ["RAG 检索增强"],
          confidence: 0.8,
          privacyLevel: "local_only",
          suggestedIntent: "explain_more",
        },
      ],
    });

    const { result } = renderHook(() => useConversationSession());

    act(() => {
      result.current.dispatchIntent("explain_more");
    });

    const state = useMobileAppStore.getState();
    expect(state.conversation.phase).toBe("explaining");
    expect(state.conversation.lastExplanation).toContain("mock");
    expect(state.graph.countVisibleNodes()).toBe(0);
  });

  it("skip clears active signal without creating permanent node", () => {
    useMobileAppStore.setState({
      conversation: selectAdaptiveSignal(createInitialConversationState(), "sig-1"),
    });

    const { result } = renderHook(() => useConversationSession());

    act(() => {
      result.current.dispatchIntent("skip");
    });

    const state = useMobileAppStore.getState();
    expect(state.conversation.phase).toBe("idle");
    expect(state.conversation.activeSignalId).toBeNull();
    expect(state.graph.countVisibleNodes()).toBe(0);
  });

  it("ingest on signal sets pending proposal without creating permanent node until confirm", () => {
    const flushPersist = vi.fn();
    useMobileAppStore.setState({
      conversation: selectAdaptiveSignal(createInitialConversationState(), "topic-a"),
      storageReady: true,
      flushPersist,
      pendingIngestProposal: null,
      signals: [
        {
          sourceType: "radar",
          userModeFit: "tech_tracker",
          freshness: 0.9,
          evidenceRefs: ["topic-a"],
          confidence: 0.8,
          privacyLevel: "local_only",
          suggestedIntent: "ingest_candidate",
        },
      ],
    });

    const { result } = renderHook(() => useConversationSession());

    act(() => {
      result.current.dispatchIntent("ingest");
    });

    let state = useMobileAppStore.getState();
    expect(state.conversation.phase).toBe("ingest_pending");
    expect(state.pendingIngestProposal?.concept).toBe("topic-a");
    expect(state.graph.countVisibleNodes()).toBe(0);

    act(() => {
      result.current.confirmPendingIngest();
    });

    state = useMobileAppStore.getState();
    expect(state.graph.countVisibleNodes()).toBe(1);
    expect(state.history.listChanges().length).toBe(1);
    expect(state.history.listChanges()[0]?.kind).toBe("node_created");
    expect(flushPersist).toHaveBeenCalled();
    expect(state.pendingIngestProposal).toBeNull();
  });

  it("provisional ingest confirm writes graph via user-confirmed path", () => {
    const candidate = useProvisionalStore.getState().addTextCapture("待入库概念");
    useMobileAppStore.setState({
      conversation: enterProvisionalPending(createInitialConversationState(), candidate.id),
    });

    const { result } = renderHook(() => useConversationSession());

    act(() => {
      result.current.dispatchIntent("ingest");
    });

    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(1);
  });
});
