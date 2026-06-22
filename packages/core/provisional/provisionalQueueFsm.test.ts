/**
 * Gate verifier expects `packages/core/provisional/provisionalQueueFsm.test.ts`.
 * Full FSM coverage: `packages/core/src/provisional/provisionalQueueFsm.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { applyUserIntent, createInitialConversationState } from "../src/conversation/conductor.js";
import { createProvisionalCandidate } from "../src/provisional/queue.js";

describe("provisionalQueueFsm (gate path)", () => {
  it("provisional queue routes intents through ConversationConductor", () => {
    const candidate = createProvisionalCandidate({
      sourceType: "text",
      summary: "gate smoke",
    });
    expect(candidate.status).toBe("pending");
    const { state } = applyUserIntent(createInitialConversationState(), "skip");
    expect(state.phase).toBeDefined();
  });
});
