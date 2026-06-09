import { describe, expect, it, vi } from "vitest";
import type { BrainGraphSnapshot, GraphEdge, GraphMutationProposal } from "@/domain/graph";
import { readRepoSource } from "@/invariants/readRepoSource";
import { createTempStorage } from "@/invariants/testStorage";
import type { StorageProvider } from "@/storage/types";
import {
  applyGraphMutation,
  persistGraphHistoryUndoSnapshot,
  persistGraphSnapshot,
  setGraphMutationClockForTests,
  visibleGraph,
} from "./graphMutations";

const baseSnapshot = (): BrainGraphSnapshot => ({
  nodes: [
    {
      id: "a",
      title: "大模型上下文窗口",
      intro: "旧简介",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "b",
      title: "过时概念",
      intro: "将被归档",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  edges: [{ id: "e1", sourceId: "b", targetId: "a", relationType: "related" }],
});

describe("graphMutations", () => {
  it("creates a concept node", () => {
    const empty: BrainGraphSnapshot = { nodes: [], edges: [] };
    const proposal: GraphMutationProposal = {
      id: "p1",
      kind: "create",
      summary: "新建 Agent Framework",
      payload: {
        title: "Agent Framework",
        intro: "智能体编排框架",
        sourceUrl: "https://github.com/example/agent",
      },
    };
    const after = applyGraphMutation(empty, proposal);
    expect(after.nodes).toHaveLength(1);
  });

  it("merges nodes and migrates edges", () => {
    const proposal: GraphMutationProposal = {
      id: "p2",
      kind: "merge",
      summary: "合并过时概念到主概念",
      payload: {
        sourceNodeId: "b",
        targetNodeId: "a",
        mergedIntro: "合并后的简介",
      },
    };
    const after = applyGraphMutation(baseSnapshot(), proposal);
    expect(after.nodes.find((node) => node.id === "b")?.archived).toBe(true);
    expect(after.nodes.find((node) => node.id === "a")?.intro).toBe("合并后的简介");
    expect(after.edges.every((edge) => edge.sourceId !== "b" && edge.targetId !== "b")).toBe(
      true,
    );
    expect(visibleGraph(after).nodes).toHaveLength(1);
  });

  it("visibleGraph hides archived edges even when endpoints stay active", () => {
    const snapshot: BrainGraphSnapshot = {
      nodes: [
        {
          id: "a",
          title: "A",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "b",
          title: "B",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [
        { id: "e-live", sourceId: "a", targetId: "b", relationType: "related" },
        {
          id: "e-hidden",
          sourceId: "b",
          targetId: "a",
          relationType: "related",
          archived: true,
        },
      ],
    };
    const visible = visibleGraph(snapshot);
    expect(visible.edges.map((edge) => edge.id)).toEqual(["e-live"]);
  });

  it("updates node fields manually", () => {
    const proposal: GraphMutationProposal = {
      id: "p3",
      kind: "update",
      summary: "更新概念",
      payload: {
        nodeId: "a",
        title: "上下文窗口",
        intro: "更新后的简介",
        sourceUrl: "https://example.com/context",
      },
    };
    const after = applyGraphMutation(baseSnapshot(), proposal);
    const node = after.nodes.find((item) => item.id === "a");
    expect(node?.title).toBe("上下文窗口");
    expect(node?.intro).toBe("更新后的简介");
    expect(node?.sourceUrl).toBe("https://example.com/context");
    expect(node?.salience).toBeGreaterThan(1);
    expect(node?.lastTouchedAt).toBeTruthy();
  });

  it("archives node and migrates incident edges", () => {
    const snapshot: BrainGraphSnapshot = {
      nodes: [
        {
          id: "keep",
          title: "保留",
          intro: "keep",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "drop",
          title: "归档",
          intro: "drop",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "peer",
          title: "关联",
          intro: "peer",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [
        { id: "e1", sourceId: "drop", targetId: "peer", relationType: "related" },
      ],
    };
    const after = applyGraphMutation(snapshot, {
      id: "p4",
      kind: "archive",
      summary: "归档并迁移边",
      payload: {
        nodeId: "drop",
        migrateEdgesToNodeId: "keep",
      },
    });
    expect(after.nodes.find((node) => node.id === "drop")?.archived).toBe(true);
    expect(after.edges.some((edge) => edge.sourceId === "keep" && edge.targetId === "peer")).toBe(
      true,
    );
    expect(after.edges.every((edge) => edge.sourceId !== "drop")).toBe(true);
  });

  it("rejects link when source or target node is missing", () => {
    const proposal: GraphMutationProposal = {
      id: "p-link-missing",
      kind: "link",
      summary: "无效连线",
      payload: {
        sourceId: "a",
        targetId: "missing",
        relationType: "related",
      },
    };
    expect(() => applyGraphMutation(baseSnapshot(), proposal)).toThrow(
      "link 节点不存在",
    );
  });

  it("rejects link when source and target are the same node", () => {
    const proposal: GraphMutationProposal = {
      id: "p-link-self",
      kind: "link",
      summary: "自环连线",
      payload: {
        sourceId: "a",
        targetId: "a",
        relationType: "related",
      },
    };
    expect(() => applyGraphMutation(baseSnapshot(), proposal)).toThrow(
      "link 源节点与目标节点不能相同",
    );
    expect(baseSnapshot().edges).toHaveLength(1);
  });

  it("rejects create when title or intro is empty", () => {
    const empty: BrainGraphSnapshot = { nodes: [], edges: [] };
    expect(() =>
      applyGraphMutation(empty, {
        id: "p-create-no-title",
        kind: "create",
        summary: "无标题",
        payload: { title: "  ", intro: "简介", sourceUrl: null },
      }),
    ).toThrow("概念标题不能为空");

    expect(() =>
      applyGraphMutation(empty, {
        id: "p-create-no-intro",
        kind: "create",
        summary: "无简介",
        payload: { title: "概念", intro: "", sourceUrl: null },
      }),
    ).toThrow("概念简介不能为空");
  });

  it("rejects update when title is empty", () => {
    expect(() =>
      applyGraphMutation(baseSnapshot(), {
        id: "p-update-no-title",
        kind: "update",
        summary: "清空标题",
        payload: {
          nodeId: "a",
          title: "   ",
          intro: "简介",
          sourceUrl: null,
        },
      }),
    ).toThrow("概念标题不能为空");
  });

  it("update mutation bumps updatedAt via mock clock", () => {
    setGraphMutationClockForTests(() => "2026-06-02T12:00:00.000Z");
    try {
      const after = applyGraphMutation(baseSnapshot(), {
        id: "p-update-intro",
        kind: "update",
        summary: "编辑简介",
        payload: {
          nodeId: "a",
          title: "大模型上下文窗口",
          intro: "新简介",
          sourceUrl: null,
        },
      });
      const node = after.nodes.find((item) => item.id === "a");
      expect(node?.intro).toBe("新简介");
      expect(node?.updatedAt).toBe("2026-06-02T12:00:00.000Z");
    } finally {
      setGraphMutationClockForTests(null);
    }
  });

  it("archive preserves sourceRefs on the archived node", () => {
    const snapshot: BrainGraphSnapshot = {
      nodes: [
        {
          id: "with-ref",
          title: "Graphiti",
          intro: "intro",
          sourceUrl: "https://example.com/graphiti",
          sourceRefs: [
            {
              url: "https://example.com/graphiti",
              title: "Graphiti 时序知识图谱",
              kind: "briefing",
              worldItemId: "radar-wi-showcase-3",
              ingestedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
    };
    const after = applyGraphMutation(snapshot, {
      id: "p-archive",
      kind: "archive",
      summary: "归档",
      payload: { nodeId: "with-ref" },
    });
    const archived = after.nodes.find((item) => item.id === "with-ref");
    expect(archived?.archived).toBe(true);
    expect(archived?.sourceRefs).toHaveLength(1);
    expect(archived?.sourceRefs?.[0]?.worldItemId).toBe("radar-wi-showcase-3");
  });

  it("persistGraphHistoryUndoSnapshot never calls deleteEdge", () => {
    const source = readRepoSource("src/lib/graphMutations.ts");
    const start = source.indexOf("export async function persistGraphHistoryUndoSnapshot");
    expect(start).toBeGreaterThan(-1);
    const tail = source.slice(start);
    const end = tail.search(/\nexport (async )?function /);
    const fnSource = end === -1 ? tail : tail.slice(0, end);
    expect(fnSource).not.toContain("deleteEdge");
    expect(fnSource).toContain("syncEdgesSnapshot");
  });

  it("persistGraphHistoryUndoSnapshot reconciles via syncEdgesSnapshot", async () => {
    const nodeA = {
      id: "n1",
      title: "A",
      intro: "a",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const nodeB = {
      id: "n2",
      title: "B",
      intro: "b",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-02T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
    };
    const before: BrainGraphSnapshot = { nodes: [nodeA], edges: [] };
    const curationEdge = {
      id: "e-curate",
      sourceId: "n1",
      targetId: "n2",
      relationType: "related" as const,
    };
    const after: BrainGraphSnapshot = {
      nodes: [nodeA],
      edges: [curationEdge],
    };
    const laterEdge = {
      id: "e-later",
      sourceId: "n1",
      targetId: "n2",
      relationType: "related" as const,
    };
    const current: BrainGraphSnapshot = {
      nodes: [nodeA, nodeB],
      edges: [curationEdge, laterEdge],
    };

    const deleteEdge = vi.fn<StorageProvider["deleteEdge"]>(async () => undefined);
    const syncEdgesSnapshot = vi.fn<StorageProvider["syncEdgesSnapshot"]>(
      async () => undefined,
    );
    const saveConcept = vi.fn<StorageProvider["saveConcept"]>(async () => undefined);
    const storage = {
      deleteEdge,
      syncEdgesSnapshot,
      saveConcept,
    } as unknown as StorageProvider;

    await persistGraphHistoryUndoSnapshot(storage, current, before, after);

    expect(deleteEdge).not.toHaveBeenCalled();
    expect(syncEdgesSnapshot).toHaveBeenCalledTimes(1);
    const synced = syncEdgesSnapshot.mock.calls[0]![0] as GraphEdge[];
    expect(synced.map((edge: GraphEdge) => edge.id).sort()).toEqual(["e-later"]);
  });

  it("persistGraphSnapshot deletes nodes and edges absent from target snapshot", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const current: BrainGraphSnapshot = {
        nodes: [
          {
            id: "keep",
            title: "Keep",
            intro: "stay",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "drop",
            title: "Drop",
            intro: "go",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-02T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "e-drop",
            sourceId: "keep",
            targetId: "drop",
            relationType: "related",
          },
        ],
      };
      for (const node of current.nodes) {
        await storage.saveConcept(node);
      }
      for (const edge of current.edges) {
        await storage.saveEdge(edge);
      }

      const target: BrainGraphSnapshot = {
        nodes: [current.nodes[0]!],
        edges: [],
      };
      await persistGraphSnapshot(storage, current, target);

      const graph = await storage.loadGraph();
      expect(graph.nodes.map((node) => node.id)).toEqual(["keep"]);
      expect(graph.edges).toHaveLength(0);
      const display = await storage.loadGraphForDisplay();
      expect(display.nodes.map((node) => node.id)).toEqual(["keep"]);
      expect(display.edges).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});
