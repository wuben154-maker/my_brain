import { describe, expect, it, vi } from "vitest";
import type { ConceptNode } from "@/domain/graph";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import type { MemoryProvider } from "@/providers/memory/types";
import {
  coarseToFineRecall,
  dedupeRecalled,
  graphZoomToMemoryLayer,
  groupConceptNodesByLayer,
  groupByLayer,
  groupRecalledByLayer,
  layerOf,
  layerOfMemoryItem,
  GRAPH_ZOOM_TOPIC_MAX,
} from "@/lib/memoryLayers";

describe("memoryLayers (M3)", () => {
  it("maps memory kinds and graph nodes to layers deterministically", () => {
    expect(
      layerOfMemoryItem({
        kind: "episode",
        text: "主题摘要",
        timestamp: 1,
      }),
    ).toBe("topic");
    expect(
      layerOfMemoryItem({
        kind: "fact",
        text: "细粒度事实",
        timestamp: 1,
      }),
    ).toBe("fact");
  });

  it("groups recalled items and visible graph nodes by layer", () => {
    const recalled = groupRecalledByLayer([
      {
        item: { kind: "episode", text: "主题", timestamp: 1 },
        score: 1,
      },
      {
        item: { kind: "fact", text: "事实", timestamp: 2 },
        score: 0.8,
      },
    ]);
    expect(recalled.topic).toHaveLength(1);
    expect(recalled.fact).toHaveLength(1);

    const nodes: ConceptNode[] = [
      {
        id: "c1",
        title: "概念",
        intro: "i",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "c2",
        title: "归档",
        intro: "i",
        sourceUrl: null,
        archived: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const grouped = groupConceptNodesByLayer(nodes);
    expect(grouped.concept).toHaveLength(1);
    expect(grouped.topic).toHaveLength(0);
  });

  it("maps graph zoom thresholds to MemoryLayer", () => {
    expect(graphZoomToMemoryLayer(GRAPH_ZOOM_TOPIC_MAX)).toBe("topic");
    expect(graphZoomToMemoryLayer(GRAPH_ZOOM_TOPIC_MAX + 0.01)).toBe(
      "concept",
    );
    expect(graphZoomToMemoryLayer(2)).toBe("fact");
  });

  it("dedupes recalled rows by id or text", () => {
    const merged = dedupeRecalled([
      {
        item: { id: "a", kind: "fact", text: "RAG", timestamp: 1 },
        score: 1,
      },
      {
        item: { id: "a", kind: "fact", text: "RAG", timestamp: 1 },
        score: 0.5,
      },
    ]);
    expect(merged).toHaveLength(1);
  });

  it("groupByLayer dispatches recalled vs concept node buckets", () => {
    const recalled = groupByLayer([
      {
        item: { kind: "episode", text: "主题", timestamp: 1 },
        score: 1,
      },
    ]);
    expect(recalled.topic).toHaveLength(1);

    const node: ConceptNode = {
      id: "c1",
      title: "概念",
      intro: "i",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(layerOf(node)).toBe("concept");
    expect(groupByLayer([node]).concept).toHaveLength(1);
  });

  it("coarseToFineRecall runs topic pass then fact pass and merges", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "episode",
        text: "用户关注 RAG 主题",
        timestamp: 1,
      },
      {
        kind: "fact",
        text: "RAG 向量检索细节",
        timestamp: 2,
      },
    ]);

    const recallSpy = vi.spyOn(memory, "recall");
    const results = await coarseToFineRecall(memory, "RAG");

    expect(recallSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(recallSpy.mock.calls[0]?.[0]?.kinds).toEqual(["episode"]);
    expect(results.some((row) => row.item.text.includes("向量"))).toBe(true);

    const refineQuery = String(recallSpy.mock.calls[1]?.[0]?.query ?? "");
    expect(refineQuery).toContain("RAG");
    expect(refineQuery.length).toBeGreaterThan("RAG".length);

    const flatFacts = await memory.recall({
      query: "RAG",
      topK: 5,
      kinds: ["fact"],
    });
    const layeredFacts = results.filter((row) => row.item.kind === "fact");
    expect(layeredFacts.length).toBeGreaterThan(0);
    expect(layeredFacts.length).toBeLessThanOrEqual(flatFacts.length);
  });

  it("degrades to single recall when coarse pass is empty", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "fact",
        text: "用户学习 RAG 事实层细节",
        timestamp: 1,
      },
    ]);

    const recallSpy = vi.spyOn(memory, "recall");
    const results = await coarseToFineRecall(memory, "RAG 事实");

    expect(recallSpy).toHaveBeenCalledTimes(2);
    expect(recallSpy.mock.calls[0]?.[0]?.kinds).toEqual(["episode"]);
    expect(recallSpy.mock.calls[1]?.[0]?.kinds).toBeUndefined();
    expect(results).toHaveLength(1);
  });

  it("returns empty when memory is missing or recall throws", async () => {
    expect(await coarseToFineRecall(undefined, "x")).toEqual([]);

    const broken: MemoryProvider = {
      remember: vi.fn(),
      recall: vi.fn(async () => {
        throw new Error("down");
      }),
      health: vi.fn(async () => ({ ok: false })),
    };
    expect(await coarseToFineRecall(broken, "x")).toEqual([]);
  });
});
