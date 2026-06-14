import { describe, expect, it } from "vitest";

import {
  applyUserIntent,
  createInitialConversationState,
  enterProvisionalPending,
  selectAdaptiveSignal,
} from "./conductor.js";

describe("ConversationConductor FSM", () => {
  it("explain_more stays non-ingest", () => {
    let state = createInitialConversationState();
    state = selectAdaptiveSignal(state, "sig-1");
    const { state: next } = applyUserIntent(state, "explain_more");
    expect(next.phase).toBe("explaining");
    expect(next.lastExplanation).toContain("mock");
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
});
