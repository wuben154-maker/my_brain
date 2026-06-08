import { describe, expect, it } from "vitest";
import {
  appendTranscriptTail,
  buildTieredContext,
  createEmptyWorking,
  recallTopKForState,
  refreshWorkingPack,
  resolveRecalledMemoriesForTurn,
  shrinkWorkingOnInterrupt,
  shrinkWorkingOnStateChange,
  workingContextFootprint,
  type ArchivalContext,
} from "@/conversation/contextTiers";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";

function graph(
  nodes: BrainGraphSnapshot["nodes"],
  edges: BrainGraphSnapshot["edges"] = [],
): BrainGraphSnapshot {
  return { nodes, edges };
}

function archival(
  nodes: BrainGraphSnapshot["nodes"],
  recalledMemories?: string,
): ArchivalContext {
  return {
    graph: graph(nodes),
    profile: DEFAULT_USER_PROFILE,
    recalledMemories,
  };
}

describe("contextTiers", () => {
  it("shrinkWorkingOnInterrupt clears transcriptTail and walkthroughNodeIds", () => {
    const working = createEmptyWorking("teaching");
    working.transcriptTail = "用户：讲讲 RAG\n助手：RAG 是检索增强生成。";
    working.walkthroughNodeIds = ["node-1", "node-2", "node-3"];
    refreshWorkingPack(archival([]), working, { packQuery: "RAG" });
    expect(working.pack).not.toBeNull();

    const before = workingContextFootprint(working);
    shrinkWorkingOnInterrupt(working);

    expect(working.transcriptTail).toBe("");
    expect(working.walkthroughNodeIds).toEqual([]);
    expect(working.pack).not.toBeNull();
    expect(workingContextFootprint(working)).toBeLessThan(before);
  });

  it("archival recalledMemories survives interrupt shrink", () => {
    const working = createEmptyWorking("idle_chat");
    working.transcriptTail = "x".repeat(200);
    shrinkWorkingOnInterrupt(working);

    const tiered = buildTieredContext({
      archival: archival([], "用户偏好简洁解释"),
      working,
      mode: "idle_chat",
    });
    expect(tiered.recalledMemories).toBe("用户偏好简洁解释");
  });

  it("shrinkWorkingOnStateChange teaching→idle_chat clears walkthrough and pack", () => {
    const nodes = Array.from({ length: 8 }, (_, index) => ({
      id: `node-${index}`,
      title: index === 2 ? "RAG" : `Topic-${index}`,
      intro: `Intro ${index}`,
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }));
    const working = createEmptyWorking("teaching");
    working.walkthroughNodeIds = ["node-2", "node-3"];
    refreshWorkingPack(archival(nodes), working, { packQuery: "RAG" });
    expect(working.pack?.graphDigest).toContain("RAG");

    shrinkWorkingOnStateChange("teaching", "idle_chat", working);

    expect(working.state).toBe("idle_chat");
    expect(working.walkthroughNodeIds).toEqual([]);
    expect(working.pack).toBeNull();
  });

  it("pack mode switch briefing→ingest_decision changes graphContextDigest", () => {
    const nodes = [
      {
        id: "brief-node",
        title: "Transformer 上下文窗口再扩展",
        intro: "更长 context。",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "ingest-node",
        title: "agent-framework-starter",
        intro: "Agent 脚手架。",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ];
    const store = archival(nodes);

    const briefingWorking = createEmptyWorking("briefing");
    refreshWorkingPack(store, briefingWorking, {
      newsTitle: "Transformer 上下文窗口再扩展",
    });
    const briefingCtx = buildTieredContext({
      archival: store,
      working: briefingWorking,
      mode: "briefing",
    });

    const ingestWorking = createEmptyWorking("ingest_decision");
    refreshWorkingPack(store, ingestWorking, {
      newsTitle: "agent-framework-starter",
    });
    const ingestCtx = buildTieredContext({
      archival: store,
      working: ingestWorking,
      mode: "ingest_decision",
    });

    expect(briefingCtx.graphContextDigest).toBeDefined();
    expect(ingestCtx.graphContextDigest).toBeDefined();
    expect(briefingCtx.graphContextDigest).toContain("Transformer");
    expect(ingestCtx.graphContextDigest).toContain("agent-framework");
    expect(briefingCtx.graphContextDigest).not.toBe(ingestCtx.graphContextDigest);
  });

  it("recallTopKForState uses light budget for chat and standard for knowledge turns", () => {
    expect(recallTopKForState("idle_chat")).toBe(2);
    expect(recallTopKForState("small_talk")).toBe(2);
    expect(recallTopKForState("briefing")).toBe(5);
    expect(recallTopKForState("teaching")).toBe(5);
  });

  it("resolveRecalledMemoriesForTurn returns distilled text for matching query", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "fact",
        text: "用户关心 RAG 向量检索",
        timestamp: Date.now(),
      },
    ]);
    const recalled = await resolveRecalledMemoriesForTurn(
      memory,
      "RAG",
      "idle_chat",
    );
    expect(recalled).toContain("RAG");
  });

  it("appendTranscriptTail caps at 300 characters", () => {
    const working = createEmptyWorking();
    appendTranscriptTail(working, "a".repeat(200));
    appendTranscriptTail(working, "b".repeat(200));
    expect(working.transcriptTail.length).toBeLessThanOrEqual(300);
    expect(working.transcriptTail.endsWith("b".repeat(100))).toBe(true);
  });
});
