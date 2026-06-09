import { beforeEach, describe, expect, it } from "vitest";
import {
  createBrainMcpServer,
  invokeBrainMcpTool,
  type BrainMcpNodeView,
} from "@/mcp/brainMcpServer";
import type { BrainOutlineEntry } from "@/mcp/brainReadonlyHandlers";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useGraphStore } from "@/stores/graphStore";

function nodeIds(nodes: BrainMcpNodeView[]): string[] {
  return nodes.map((node) => node.id);
}

function flattenOutlineIds(entries: BrainOutlineEntry[]): string[] {
  return entries.flatMap((entry) => [
    entry.id,
    ...flattenOutlineIds(entry.children),
  ]);
}

describe("brainMcpRead.integration", () => {
  beforeEach(() => {
    useGraphStore.getState().setGraph(SHOWCASE_GRAPH_SNAPSHOT);
  });

  it("read tools return showcase data without mutating graphStore", async () => {
    const beforeCount = useGraphStore.getState().nodes.length;
    const beforeNodes = structuredClone(useGraphStore.getState().nodes);
    const beforeEdges = structuredClone(useGraphStore.getState().edges);

    const server = createBrainMcpServer({
      mode: "read_only",
      deps: {
        loadGraph: async () => useGraphStore.getState(),
        loadUserProfile: async () => DEFAULT_USER_PROFILE,
      },
    });

    const search = (await invokeBrainMcpTool(server, "brain_search_nodes", {
      query: "Agent",
      limit: 10,
    })) as { nodes: BrainMcpNodeView[] };
    expect(nodeIds(search.nodes)).toContain("demo-agent");
    expect(search.nodes[0]).not.toHaveProperty("salience");
    expect(search.nodes[0]).not.toHaveProperty("createdAt");

    const node = (await invokeBrainMcpTool(server, "brain_get_node", {
      nodeId: "demo-agent",
    })) as BrainMcpNodeView | null;
    expect(node?.id).toBe("demo-agent");
    expect(node?.title).toBe("AI Agent");
    expect(Object.keys(node ?? {})).toEqual(
      expect.arrayContaining(["id", "title", "intro", "sourceRefs", "archived"]),
    );

    const outline = (await invokeBrainMcpTool(server, "brain_graph_outline", {})) as {
      outline: BrainOutlineEntry[];
    };
    const outlineIds = flattenOutlineIds(outline.outline);
    expect(outlineIds).toContain("demo-agent");

    const neighborhood = (await invokeBrainMcpTool(server, "brain_node_neighborhood", {
      nodeId: "demo-agent",
      hops: 2,
    })) as { nodes: BrainMcpNodeView[]; edges: unknown[] };
    expect(nodeIds(neighborhood.nodes)).toContain("demo-agent");
    expect(neighborhood.edges.length).toBeGreaterThan(0);

    expect(useGraphStore.getState().nodes.length).toBe(beforeCount);
    expect(useGraphStore.getState().nodes).toEqual(beforeNodes);
    expect(useGraphStore.getState().edges).toEqual(beforeEdges);
  });
});
