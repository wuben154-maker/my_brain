import { describe, expect, it } from "vitest";
import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";
import { applyGraphMutation, visibleGraph } from "./graphMutations";

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
});
