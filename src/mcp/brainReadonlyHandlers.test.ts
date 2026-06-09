import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import {
  assertReadonlyToolList,
  BRAIN_WRITE_TOOL_BLOCKLIST,
  brainGetNode,
  brainNeighborhood,
  brainOutline,
  brainProfileDigest,
  brainSearch,
  listReadonlyTools,
  type BrainReadonlyDeps,
} from "@/mcp/brainReadonlyHandlers";

function node(partial: Partial<ConceptNode> & Pick<ConceptNode, "id" | "title">): ConceptNode {
  return {
    intro: "",
    sourceUrl: null,
    archived: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

function deps(graph: BrainGraphSnapshot): BrainReadonlyDeps {
  return {
    loadGraph: async () => graph,
    loadUserProfile: async () => DEFAULT_USER_PROFILE,
  };
}

describe("brainReadonlyHandlers", () => {
  it("empty graph search returns empty nodes", async () => {
    const result = await brainSearch("RAG", 5, deps({ nodes: [], edges: [] }));
    expect(result.nodes).toEqual([]);
  });

  it("fixture graph search returns matching nodes", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        node({ id: "n-rag", title: "RAG", intro: "检索增强生成" }),
        node({ id: "n-llm", title: "LLM", intro: "大语言模型" }),
        node({ id: "n-agent", title: "Agent", intro: "自主代理框架" }),
      ],
      edges: [],
    };
    const result = await brainSearch("RAG", 5, deps(graph));
    expect(result.nodes.map((n) => n.id)).toEqual(["n-rag"]);
  });

  it("brainGetNode returns null for missing id", async () => {
    const result = await brainGetNode("missing", deps({ nodes: [], edges: [] }));
    expect(result).toBeNull();
  });

  it("brainNeighborhood expands hops on fixture graph", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        node({ id: "a", title: "A" }),
        node({ id: "b", title: "B" }),
        node({ id: "c", title: "C" }),
      ],
      edges: [
        {
          id: "e-ab",
          sourceId: "a",
          targetId: "b",
          relationType: "related",
        },
        {
          id: "e-bc",
          sourceId: "b",
          targetId: "c",
          relationType: "related",
        },
      ],
    };
    const twoHop = await brainNeighborhood("a", 2, deps(graph));
    expect(twoHop.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    expect(twoHop.edges).toHaveLength(2);
  });

  it("brainOutline skips archived nodes", () => {
    const outline = brainOutline({
      nodes: [
        node({ id: "live", title: "Live" }),
        node({ id: "gone", title: "Gone", archived: true }),
      ],
      edges: [],
    });
    expect(outline.map((entry) => entry.id)).toEqual(["live"]);
  });

  it("brainProfileDigest is sanitized without internal topicWeights", () => {
    const digest = brainProfileDigest({
      ...DEFAULT_USER_PROFILE,
      displayName: "小明",
      interests: ["AI", "Rust"],
      topicWeights: { secret_topic: 99 },
    });
    expect(digest).toContain("小明");
    expect(digest).toContain("AI");
    expect(digest).not.toContain("topicWeights");
    expect(digest).not.toContain("secret_topic");
  });

  it("post-ingest fixture: search, neighborhood, outline, get_node stay read-only", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        node({
          id: "n-rag",
          title: "RAG",
          intro: "检索增强生成，向量检索降低幻觉",
          sourceUrl: "https://example.com/rag",
        }),
        node({
          id: "n-agent",
          title: "Agent 编排",
          intro: "多步工具调用与规划",
        }),
        node({
          id: "n-ctx",
          title: "上下文窗口",
          intro: "长文档输入能力",
        }),
        node({
          id: "n-archived",
          title: "过时概念",
          intro: "已归档",
          archived: true,
        }),
      ],
      edges: [
        {
          id: "e-rag-agent",
          sourceId: "n-rag",
          targetId: "n-agent",
          relationType: "related",
        },
        {
          id: "e-agent-ctx",
          sourceId: "n-agent",
          targetId: "n-ctx",
          relationType: "related",
        },
      ],
    };
    const readonlyDeps = deps(graph);

    const search = await brainSearch("RAG 向量", 5, readonlyDeps);
    expect(search.nodes.map((n) => n.id)).toContain("n-rag");

    const center = await brainGetNode("n-rag", readonlyDeps);
    expect(center?.title).toBe("RAG");

    const neighborhood = await brainNeighborhood("n-rag", 2, readonlyDeps);
    expect(neighborhood.nodes.map((n) => n.id).sort()).toEqual([
      "n-agent",
      "n-ctx",
      "n-rag",
    ]);
    expect(neighborhood.edges).toHaveLength(2);
    expect(neighborhood.nodes.some((n) => n.id === "n-archived")).toBe(false);

    const outline = brainOutline(graph);
    const outlineIds = outline.flatMap(function collect(
      entry,
    ): string[] {
      return [entry.id, ...entry.children.flatMap(collect)];
    });
    expect(outlineIds).toContain("n-rag");
    expect(outlineIds).not.toContain("n-archived");
  });

  it("brainNeighborhood hides archived edges on active endpoints", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        node({ id: "a", title: "A" }),
        node({ id: "b", title: "B" }),
      ],
      edges: [
        {
          id: "e-live",
          sourceId: "a",
          targetId: "b",
          relationType: "related",
        },
        {
          id: "e-archived",
          sourceId: "b",
          targetId: "a",
          relationType: "related",
          archived: true,
        },
      ],
    };
    const neighborhood = await brainNeighborhood("a", 1, deps(graph));
    expect(neighborhood.edges.map((edge) => edge.id)).toEqual(["e-live"]);
  });

  it("listReadonlyTools has no write tools", () => {
    const tools = listReadonlyTools();
    expect(tools).toEqual([
      "brain_search_nodes",
      "brain_get_node",
      "brain_graph_outline",
      "brain_node_neighborhood",
    ]);
    for (const blocked of BRAIN_WRITE_TOOL_BLOCKLIST) {
      expect(tools).not.toContain(blocked);
    }
    expect(() => assertReadonlyToolList()).not.toThrow();
  });
});
