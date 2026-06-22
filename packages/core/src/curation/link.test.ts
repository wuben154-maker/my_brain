import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  restoreSnapshotFromChange,
} from "../graph/memoryRepository.js";
import { applyCurationAction } from "./apply.js";
import { planFromFixtureActions } from "./planner.js";
import { runCurationPlan } from "./run.js";

function linkSnapshot() {
  return {
    nodes: [
      {
        id: "node-new",
        concept: "向量数据库 入门",
        intro: "new",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "node-old",
        concept: "向量数据库 基础",
        intro: "old",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    edges: [],
  };
}

describe("curation link fixture", () => {
  it("adds a related edge without creating nodes", () => {
    const before = linkSnapshot();
    const after = applyCurationAction(before, {
      kind: "link",
      fromId: "node-new",
      toId: "node-old",
      relation: "related_to",
      summary: "自动关联相似概念",
    });

    expect(after.nodes).toHaveLength(2);
    expect(after.edges).toHaveLength(1);
    expect(after.edges[0]).toMatchObject({
      fromId: "node-new",
      toId: "node-old",
      relation: "related_to",
    });
  });

  it("records history and undo removes the auto-linked edge", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(linkSnapshot());
    const history = new InMemoryHistoryRepository();
    const before = graph.getSnapshot();

    const result = runCurationPlan(
      { graph, history },
      {
        ingestedNodeId: "node-new",
        plan: planFromFixtureActions([
          {
            kind: "link",
            fromId: "node-new",
            toId: "node-old",
            relation: "related_to",
            summary: "自动关联相似概念",
          },
        ]),
      },
    );

    expect(result.status).toBe("applied");
    expect(result.summary).toContain("自动关联相似概念");
    expect(result.edgesAdded).toBe(1);
    expect(history.listChanges()[0]?.kind).toBe("edge_created");
    expect(history.listChanges()[0]?.summary).toBe("自动关联相似概念");

    const undone = history.undoLastChange();
    restoreSnapshotFromChange(graph, undone!);
    expect(graph.getSnapshot()).toEqual(before);
  });
});
