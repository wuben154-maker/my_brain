import { describe, expect, it } from "vitest";
import { buildConversationContext } from "@/conversation/buildContext";
import {
  appendTranscriptTail,
  createEmptyWorking,
  resolveRecalledMemoriesForTurn,
} from "@/conversation/contextTiers";
import { DEFAULT_ONBOARDING } from "@/conversation/types";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";

function graph(
  nodes: BrainGraphSnapshot["nodes"],
  edges: BrainGraphSnapshot["edges"] = [],
): BrainGraphSnapshot {
  return { nodes, edges };
}

describe("buildConversationContext", () => {
  it("teaching mode graphContextDigest contains query-related node and excludes distant nodes", () => {
    const nodes = Array.from({ length: 30 }, (_, index) => ({
      id: `node-${index}`,
      title: index === 5 ? "RAG" : `Concept-${index}`,
      intro: `Intro ${index}`,
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }));

    const ctx = buildConversationContext({
      newsQueue: [],
      newsCursor: 0,
      graph: graph(nodes),
      profile: DEFAULT_USER_PROFILE,
      onboarding: DEFAULT_ONBOARDING,
      conversationState: "teaching",
      packQuery: "RAG",
    });

    expect(ctx.graphContextDigest).toBeDefined();
    expect(ctx.graphContextDigest).toContain("RAG");
    expect(ctx.graphContextDigest).not.toContain("Concept-29");
  });

  it("idle_chat omits subgraph from graphContextDigest", () => {
    const nodes = Array.from({ length: 5 }, (_, index) => ({
      id: `node-${index}`,
      title: `Topic-${index}`,
      intro: `Intro ${index}`,
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }));

    const ctx = buildConversationContext({
      newsQueue: [],
      newsCursor: 0,
      graph: graph(nodes),
      profile: DEFAULT_USER_PROFILE,
      onboarding: DEFAULT_ONBOARDING,
      conversationState: "idle_chat",
      packQuery: "Topic-0",
    });

    expect(ctx.graphContextDigest ?? "").not.toContain("<brain_subgraph>");
  });

  it("integration: recalled memories + working tier flow into tiered graphContextDigest on teaching turn", async () => {
    const nodes = [
      {
        id: "node-rag",
        title: "RAG",
        intro: "检索增强生成",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "node-agent",
        title: "Agent",
        intro: "自主代理",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ];

    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "fact",
        text: "用户偏好简洁解释 RAG",
        timestamp: Date.now(),
      },
    ]);
    const recalledMemories = await resolveRecalledMemoriesForTurn(
      memory,
      "讲讲 RAG",
      "teaching",
    );
    expect(recalledMemories).toContain("RAG");

    const working = createEmptyWorking("teaching");
    appendTranscriptTail(working, "用户：讲讲 RAG");

    const ctx = buildConversationContext({
      newsQueue: [],
      newsCursor: 0,
      graph: graph(nodes),
      profile: DEFAULT_USER_PROFILE,
      onboarding: DEFAULT_ONBOARDING,
      recalledMemories,
      conversationState: "teaching",
      packQuery: "讲讲 RAG",
      working,
    });

    expect(ctx.recalledMemories).toContain("RAG");
    expect(ctx.graphContextDigest).toBeDefined();
    expect(ctx.graphContextDigest).toContain("RAG");
    expect(ctx.graphContextDigest).toContain("<brain_subgraph>");
    expect(working.transcriptTail).toContain("讲讲 RAG");
  });
});
