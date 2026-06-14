import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "../graph/memoryRepository.js";
import { applyIngestCreate, runAutoCurateAfterIngest, undoLastGraphChangeInMemory } from "./ingest.js";

describe("applyIngestCreate", () => {
  it("creates permanent node only after user confirm path", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    expect(graph.countVisibleNodes()).toBe(0);

    const result = applyIngestCreate(
      { concept: "Rust 所有权", intro: "短介绍", sourceLinks: [] },
      { graph, history },
    );

    expect(graph.countVisibleNodes()).toBe(1);
    expect(result.nodeId).toMatch(/^node-/);
    expect(history.listChanges().length).toBeGreaterThan(0);
  });

  it("auto-curate adds edge when second node exists", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    graph.createNode({ concept: "A", intro: "a", sourceLinks: [] });
    applyIngestCreate({ concept: "B", intro: "b", sourceLinks: [] }, { graph, history });
    expect(graph.getSnapshot().edges.length).toBeGreaterThan(0);
  });

  it("undo restores graph before last change", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    applyIngestCreate({ concept: "UndoMe", intro: "x", sourceLinks: [] }, { graph, history });
    expect(graph.countVisibleNodes()).toBe(1);
    const summary = undoLastGraphChangeInMemory(graph, history);
    expect(summary).toContain("入库");
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("auto-curate empty when single node", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const node = graph.createNode({ concept: "Only", intro: "o", sourceLinks: [] });
    const result = runAutoCurateAfterIngest(node.id, { graph, history });
    expect(result.summary).toContain("无结构整理");
  });
});
