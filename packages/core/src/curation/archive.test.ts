import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  restoreSnapshotFromChange,
} from "../graph/memoryRepository.js";
import { applyCurationAction } from "./apply.js";
import { planFromFixtureActions } from "./planner.js";
import { runCurationPlan } from "./run.js";

function archiveSnapshot() {
  return {
    nodes: [
      {
        id: "node-keep",
        concept: "保留",
        intro: "keep",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "node-drop",
        concept: "过时",
        intro: "drop",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    edges: [
      {
        id: "edge-1",
        fromId: "node-drop",
        toId: "node-keep",
        relation: "related_to",
      },
    ],
  };
}

describe("curation archive fixture", () => {
  it("hides node instead of hard-deleting and migrates edges", () => {
    const before = archiveSnapshot();
    const after = applyCurationAction(before, {
      kind: "archive",
      nodeId: "node-drop",
      migrateEdgesToNodeId: "node-keep",
      summary: "归档过时概念",
    });

    expect(after.nodes).toHaveLength(2);
    expect(after.nodes.find((node) => node.id === "node-drop")?.archived).toBe(true);
    expect(after.edges.every((edge) => edge.fromId !== "node-drop" && edge.toId !== "node-drop")).toBe(
      true,
    );
  });

  it("records history and undo unarchives the node", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(archiveSnapshot());
    const history = new InMemoryHistoryRepository();
    const before = graph.getSnapshot();

    const result = runCurationPlan(
      { graph, history },
      {
        ingestedNodeId: "node-keep",
        plan: planFromFixtureActions([
          {
            kind: "archive",
            nodeId: "node-drop",
            migrateEdgesToNodeId: "node-keep",
            summary: "归档过时概念",
          },
        ]),
      },
    );

    expect(result.status).toBe("applied");
    expect(result.summary).toContain("归档过时概念");
    expect(graph.countVisibleNodes()).toBe(1);
    expect(graph.getSnapshot().nodes).toHaveLength(2);
    expect(history.listChanges()[0]?.kind).toBe("node_archived");
    expect(history.listChanges()[0]?.summary).toBe("归档过时概念");

    const undone = history.undoLastChange();
    restoreSnapshotFromChange(graph, undone!);
    expect(graph.getSnapshot()).toEqual(before);
    expect(graph.countVisibleNodes()).toBe(2);
  });
});
