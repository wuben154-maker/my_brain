import { describe, expect, it } from "vitest";
import {
  assertBrainMcpCatalog,
  BrainMcpToolCatalog,
  BRAIN_MCP_READ_TOOL_NAMES,
  listBrainMcpReadTools,
  MCP_FORBIDDEN_TOOLS,
} from "@/mcp/brainMcpTools";
import { createBrainMcpServer } from "@/mcp/brainMcpServer";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

describe("brainMcpCatalog", () => {
  it("allows exactly 4 read tools with permissionLevel read", () => {
    expect(BRAIN_MCP_READ_TOOL_NAMES).toEqual([
      "brain_search_nodes",
      "brain_get_node",
      "brain_graph_outline",
      "brain_node_neighborhood",
    ]);
    expect(BrainMcpToolCatalog).toHaveLength(4);
    for (const tool of BrainMcpToolCatalog) {
      expect(tool.permissionLevel).toBe("read");
    }
    expect(() => assertBrainMcpCatalog()).not.toThrow();
  });

  it("registers 0 forbidden tools on read_only server", () => {
    const server = createBrainMcpServer({
      mode: "read_only",
      deps: {
        loadGraph: async () => SHOWCASE_GRAPH_SNAPSHOT,
        loadUserProfile: async () => DEFAULT_USER_PROFILE,
      },
    });

    const registered = [...server.tools.keys()];
    expect(registered).toEqual(listBrainMcpReadTools());
    for (const forbidden of MCP_FORBIDDEN_TOOLS) {
      expect(registered).not.toContain(forbidden);
      expect(server.tools.has(forbidden as (typeof registered)[number])).toBe(false);
    }
  });
});
