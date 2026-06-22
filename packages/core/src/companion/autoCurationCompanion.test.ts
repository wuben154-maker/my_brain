import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  restoreSnapshotFromChange,
} from "../graph/memoryRepository.js";
import { applyCurationAction } from "../curation/apply.js";
import { planFromFixtureActions } from "../curation/planner.js";
import {
  runCompanionAutoCuration,
  undoCompanionAutoCuration,
} from "./autoCurationCompanion.js";

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

describe("companion auto curation", () => {
  it("records merge reason and history summary after post-ingest curation", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(baseSnapshot());
    const history = new InMemoryHistoryRepository();

    const result = runCompanionAutoCuration(
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
    expect(result.historyEntries).toHaveLength(1);
    expect(result.historyEntries[0]?.kind).toBe("auto_curate_merge");
    expect(result.historyEntries[0]?.reason).toBe("自动合并过时概念");
    expect(result.historySummary).toContain("auto_curate_merge");
    expect(graph.getSnapshot().nodes.find((node) => node.id === "node-b")?.archived).toBe(true);
  });

  it("records link reason and history summary after post-ingest curation", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot({
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
    });
    const history = new InMemoryHistoryRepository();

    const result = runCompanionAutoCuration(
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
    expect(result.historyEntries).toHaveLength(1);
    expect(result.historyEntries[0]?.kind).toBe("edge_created");
    expect(result.historyEntries[0]?.reason).toBe("自动关联相似概念");
    expect(result.historySummary).toContain("自动关联相似概念");
  });

  it("records archive reason without hard-delete via post-ingest curation", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot({
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
      edges: [],
    });
    const history = new InMemoryHistoryRepository();

    const result = runCompanionAutoCuration(
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
    expect(result.historyEntries).toHaveLength(1);
    expect(result.historyEntries[0]?.kind).toBe("node_archived");
    expect(result.historyEntries[0]?.reason).toBe("归档过时概念");
    expect(graph.getSnapshot().nodes).toHaveLength(2);
    expect(graph.getSnapshot().nodes.find((node) => node.id === "node-drop")?.archived).toBe(true);
  });

  it("undo restores pre-merge snapshot with companion summary", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(baseSnapshot());
    const history = new InMemoryHistoryRepository();

    runCompanionAutoCuration(
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

    const undo = undoCompanionAutoCuration(graph, history);
    expect(undo.restored).toBe(true);
    expect(undo.summary).toBe("自动合并过时概念");
    expect(undo.undoneKind).toBe("auto_curate_merge");
    expect(graph.getSnapshot()).toEqual(baseSnapshot());
  });

  it("archive action keeps node recoverable via history undo", () => {
    const before = baseSnapshot();
    const after = applyCurationAction(before, {
      kind: "archive",
      nodeId: "node-b",
      summary: "归档过时概念",
    });

    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(after);
    const history = new InMemoryHistoryRepository();
    history.pushChange({
      kind: "node_archived",
      summary: "归档过时概念",
      before,
      after,
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    expect(graph.getSnapshot().nodes.find((node) => node.id === "node-b")?.archived).toBe(true);

    const undo = undoCompanionAutoCuration(graph, history);
    expect(undo.restored).toBe(true);
    expect(graph.getSnapshot().nodes.find((node) => node.id === "node-b")?.archived).toBe(false);
  });

  it("returns empty history summary when curation is noop", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(baseSnapshot());
    const history = new InMemoryHistoryRepository();

    const result = runCompanionAutoCuration(
      { graph, history },
      {
        ingestedNodeId: "node-a",
        plan: planFromFixtureActions([]),
      },
    );

    expect(result.status).toBe("noop");
    expect(result.historyEntries).toHaveLength(0);
    expect(result.historySummary).toBe("无新增结构整理记录");
  });

  it("manual restoreSnapshotFromChange still matches merge fixture behavior", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot(baseSnapshot());
    const history = new InMemoryHistoryRepository();

    runCompanionAutoCuration(
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

    const undone = history.undoLastChange();
    expect(undone).not.toBeNull();
    restoreSnapshotFromChange(graph, undone!);
    expect(graph.getSnapshot()).toEqual(baseSnapshot());
  });
});
