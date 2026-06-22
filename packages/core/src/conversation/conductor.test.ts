import { describe, expect, it } from "vitest";

import {
  applyExplainMoreToState,
  applyUserIntent,
  createInitialConversationState,
  enterProvisionalPending,
  resolveExplainTopicFromConversation,
  selectAdaptiveSignal,
} from "./conductor.js";

describe("ConversationConductor FSM", () => {
  it("explain_more stays non-ingest with mock fallback", () => {
    let state = createInitialConversationState();
    state = selectAdaptiveSignal(state, "sig-1");
    const { state: next } = applyUserIntent(state, "explain_more", {
      explainTopic: "RAG",
    });
    expect(next.phase).toBe("explaining");
    expect(next.lastExplanation).toContain("mock");
    expect(next.lastExplanation).toContain("不会自动入库");
  });

  it("skip returns to idle", () => {
    let state = selectAdaptiveSignal(createInitialConversationState(), "sig-1");
    const { state: next } = applyUserIntent(state, "skip");
    expect(next.phase).toBe("idle");
    expect(next.activeSignalId).toBeNull();
  });

  it("ingest intent enters ingest_pending", () => {
    let state = selectAdaptiveSignal(createInitialConversationState(), "sig-1");
    const { state: next } = applyUserIntent(state, "ingest");
    expect(next.phase).toBe("ingest_pending");
  });

  it("provisional_pending phase", () => {
    const state = enterProvisionalPending(createInitialConversationState(), "prov-1");
    expect(state.phase).toBe("provisional_pending");
    expect(state.activeProvisionalId).toBe("prov-1");
  });

  it("applyExplainMoreToState accepts precomputed LLM text", () => {
    const state = selectAdaptiveSignal(createInitialConversationState(), "sig-1");
    const { state: next, assistantReply } = applyExplainMoreToState(
      state,
      "LLM 个性化解释内容",
    );
    expect(next.phase).toBe("explaining");
    expect(assistantReply).toBe("LLM 个性化解释内容");
    expect(next.lastExplanation).toBe("LLM 个性化解释内容");
  });

  it("resolveExplainTopicFromConversation prefers provisional summary", () => {
    const topic = resolveExplainTopicFromConversation({
      activeSignalId: null,
      activeProvisionalId: "prov-1",
      provisionalSummaries: [{ id: "prov-1", summary: "分享摘要" }],
    });
    expect(topic.topic).toBe("分享摘要");
  });
});
