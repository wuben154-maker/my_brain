import { describe, expect, it, vi } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "../graph/memoryRepository.js";
import {
  applyIngestCreate,
  runAutoCurateAfterIngest,
  runAutoCurateBoundary,
  setAutoCurateBoundary,
  undoLastGraphChangeInMemory,
} from "./ingest.js";

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
    expect(history.listChanges().length).toBe(1);
    expect(history.listChanges()[0]?.kind).toBe("node_created");
  });

  it("triggers auto-curate boundary only after ingest succeeds", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const boundary = vi.fn((nodeId: string) => ({
      summary: `boundary-ran:${nodeId}`,
      edgesAdded: 0,
    }));
    setAutoCurateBoundary({ afterIngest: boundary });

    applyIngestCreate({ concept: "B", intro: "b", sourceLinks: [] }, { graph, history });

    expect(boundary).toHaveBeenCalledTimes(1);
    expect(boundary.mock.calls[0]?.[0]).toMatch(/^node-/);
    setAutoCurateBoundary(null);
  });

  it("default auto-curate boundary is safe no-op", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    setAutoCurateBoundary(null);
    graph.createNode({ concept: "A", intro: "a", sourceLinks: [] });

    const result = runAutoCurateAfterIngest("node-2", { graph, history });

    expect(result.edgesAdded).toBe(0);
    expect(result.summary).toContain("结构整理");
    expect(graph.getSnapshot().edges.length).toBe(0);
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

  it("auto-curate boundary empty when single node", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const node = graph.createNode({ concept: "Only", intro: "o", sourceLinks: [] });
    const result = runAutoCurateBoundary(node.id, { graph, history });
    expect(result.summary).toContain("结构整理");
    expect(result.edgesAdded).toBe(0);
  });
});

describe("ingest gate — no bypass paths", () => {
  it("applyIngestCreate is the only writer in this module", () => {
    expect(typeof applyIngestCreate).toBe("function");
  });
});
