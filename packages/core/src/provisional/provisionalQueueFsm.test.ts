import { describe, expect, it, vi } from "vitest";

import {
  applyUserIntent,
  createInitialConversationState,
  enterProvisionalPending,
  type UserIntent,
} from "../conversation/conductor.js";
import { InMemoryGraphRepository, InMemoryHistoryRepository } from "../graph/memoryRepository.js";
import * as ingestModule from "../conversation/ingest.js";
import {
  addCandidate,
  confirmCandidate,
  createProvisionalCandidate,
  explainCandidate,
  rejectCandidate,
} from "./queue.js";

const THREE_INTENTS: UserIntent[] = ["ingest", "skip", "explain_more"];

/**
 * Provisional queue must route all three intents through ConversationConductor FSM,
 * then apply queue side-effects — never a parallel ingest FSM.
 */
function dispatchProvisionalIntent(
  intent: UserIntent,
  deps: { graph: InMemoryGraphRepository; history: InMemoryHistoryRepository },
): { conversationPhase: string; graphNodes: number } {
  const candidate = createProvisionalCandidate({
    sourceType: "text",
    summary: "队列项",
    linkUrl: "https://example.com/q",
  });
  let queue = addCandidate([], candidate);
  let conversation = enterProvisionalPending(createInitialConversationState(), candidate.id);
  const { state: next } = applyUserIntent(conversation, intent);
  conversation = next;

  if (intent === "ingest" && conversation.activeProvisionalId) {
    confirmCandidate(queue, conversation.activeProvisionalId, deps);
  } else if (intent === "skip" && conversation.activeProvisionalId) {
    queue = rejectCandidate(queue, conversation.activeProvisionalId);
  } else if (intent === "explain_more" && conversation.activeProvisionalId) {
    explainCandidate(queue, conversation.activeProvisionalId);
  }

  return { conversationPhase: conversation.phase, graphNodes: deps.graph.countVisibleNodes() };
}

describe("provisional queue FSM — reuses ConversationConductor", () => {
  it("all three intents go through applyUserIntent (not a forked FSM)", () => {
    for (const intent of THREE_INTENTS) {
      let state = enterProvisionalPending(createInitialConversationState(), "prov-x");
      const { state: next } = applyUserIntent(state, intent);
      expect(next.turns.length).toBeGreaterThan(0);
      if (intent === "explain_more") {
        expect(next.phase).toBe("explaining");
      } else if (intent === "skip") {
        expect(next.phase).toBe("idle");
      } else {
        expect(next.phase).toBe("ingest_pending");
      }
    }
  });

  it("ingest intent alone creates permanent node via confirmCandidate", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const { conversationPhase, graphNodes } = dispatchProvisionalIntent("ingest", {
      graph,
      history,
    });

    expect(conversationPhase).toBe("ingest_pending");
    expect(graphNodes).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("skip intent rejects provisional without permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const { conversationPhase, graphNodes } = dispatchProvisionalIntent("skip", {
      graph,
      history,
    });

    expect(conversationPhase).toBe("idle");
    expect(graphNodes).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("explain_more does not create permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const { conversationPhase, graphNodes } = dispatchProvisionalIntent("explain_more", {
      graph,
      history,
    });

    expect(conversationPhase).toBe("explaining");
    expect(graphNodes).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
