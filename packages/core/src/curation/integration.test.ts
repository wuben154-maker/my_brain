import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "../graph/memoryRepository.js";
import { applyIngestCreate, setAutoCurateBoundary } from "../conversation/ingest.js";
import { planOverlapCuration } from "./planner.js";
import { runPostIngestCuration } from "./run.js";

describe("post-ingest overlap planner", () => {
  it("links similar concepts after ingest without creating nodes", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    graph.createNode({
      concept: "向量数据库 基础",
      intro: "old",
      sourceLinks: [],
    });

    const ingest = applyIngestCreate(
      { concept: "向量数据库 入门", intro: "new", sourceLinks: [] },
      { graph, history },
    );

    expect(graph.countVisibleNodes()).toBe(2);
    expect(ingest.autoCurateSummary).toContain("关联");
    expect(graph.getSnapshot().edges.length).toBe(1);
    expect(history.listChanges().some((change) => change.kind === "edge_created")).toBe(true);
    expect(history.listChanges().some((change) => change.kind === "node_created")).toBe(true);
  });

  it("merges near-duplicate concepts after ingest", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const shared = "RAG 检索增强";
    graph.createNode({ concept: shared, intro: "canonical", sourceLinks: [] });

    const ingest = applyIngestCreate(
      { concept: shared, intro: "new intro", sourceLinks: [] },
      { graph, history },
    );

    expect(ingest.autoCurateSummary).toContain("合并");
    expect(graph.countVisibleNodes()).toBe(1);
    expect(history.listChanges().some((change) => change.kind === "auto_curate_merge")).toBe(
      true,
    );
  });

  it("does not bypass user-confirmed ingest for node creation", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const beforeCount = graph.countVisibleNodes();

    const plan = planOverlapCuration(graph.getSnapshot(), "missing-node");
    const result = runPostIngestCuration(
      { graph, history },
      { ingestedNodeId: "missing-node", plan },
    );

    expect(result.status).toBe("noop");
    expect(graph.countVisibleNodes()).toBe(beforeCount);
  });

  it("custom boundary override still works", () => {
    setAutoCurateBoundary({
      afterIngest: () => ({ summary: "custom-boundary", edgesAdded: 0 }),
    });

    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    graph.createNode({ concept: "Peer", intro: "p", sourceLinks: [] });
    const ingest = applyIngestCreate(
      { concept: "New", intro: "n", sourceLinks: [] },
      { graph, history },
    );

    expect(ingest.autoCurateSummary).toBe("custom-boundary");
    setAutoCurateBoundary(null);
  });
});
