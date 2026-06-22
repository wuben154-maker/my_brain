import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  restoreSnapshotFromChange,
} from "../graph/memoryRepository.js";
import { applyCurationAction } from "./apply.js";
import { planFromFixtureActions } from "./planner.js";
import { runCurationPlan } from "./run.js";

function baseSnapshot() {
  return {
    nodes: [
      {
        id: "node-a",
        concept: "大模型上下文窗口",
        intro: "旧简介",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "node-b",
        concept: "过时概念",
        intro: "将被合并",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    edges: [
      {
        id: "edge-1",
        fromId: "node-b",
        toId: "node-a",
        relation: "related_to",
      },
    ],
  };
}

describe("curation merge fixture", () => {
  it("merges source into target, archives source, and migrates edges", () => {
    const before = baseSnapshot();
    const after = applyCurationAction(before, {
      kind: "merge",
      sourceNodeId: "node-b",
      targetNodeId: "node-a",
      mergedIntro: "合并后的简介",
      summary: "自动合并过时概念",
    });

    expect(after.nodes.find((node) => node.id === "node-b")?.archived).toBe(true);
    expect(after.nodes.find((node) => node.id === "node-a")?.intro).toBe("合并后的简介");
    expect(after.edges.every((edge) => edge.fromId !== "node-b" && edge.toId !== "node-b")).toBe(
      true,
    );
    expect(after.nodes).toHaveLength(2);
  });

  it("records history and undo restores pre-merge snapshot", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(baseSnapshot());
    const history = new InMemoryHistoryRepository();

    const result = runCurationPlan(
      { graph, history },
      {
        ingestedNodeId: "node-b",
        plan: planFromFixtureActions([
          {
            kind: "merge",
            sourceNodeId: "node-b",
            targetNodeId: "node-a",
            mergedIntro: "合并后的简介",
            summary: "自动合并过时概念",
          },
        ]),
      },
    );

    expect(result.status).toBe("applied");
    expect(result.summary).toContain("自动合并过时概念");
    expect(graph.getSnapshot().nodes.find((node) => node.id === "node-b")?.archived).toBe(true);
    expect(history.listChanges()).toHaveLength(1);
    expect(history.listChanges()[0]?.kind).toBe("auto_curate_merge");
    expect(history.listChanges()[0]?.summary).toBe("自动合并过时概念");

    const undone = history.undoLastChange();
    expect(undone).not.toBeNull();
    restoreSnapshotFromChange(graph, undone!);
    expect(graph.getSnapshot()).toEqual(baseSnapshot());
  });
});
