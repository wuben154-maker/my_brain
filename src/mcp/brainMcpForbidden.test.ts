import { beforeEach, describe, expect, it } from "vitest";
import {
  BrainMcpForbiddenError,
  BrainMcpToolNotFoundError,
  createBrainMcpServer,
  invokeBrainMcpTool,
} from "@/mcp/brainMcpServer";
import { MCP_FORBIDDEN_TOOLS } from "@/mcp/brainMcpTools";
import { readRepoSource } from "@/invariants/readRepoSource";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useCognitiveActionStore } from "@/stores/cognitiveActionStore";
import { useGraphStore } from "@/stores/graphStore";

const MCP_SOURCE_FILES = [
  "src/mcp/brainMcpTools.ts",
  "src/mcp/brainMcpServer.ts",
  "src/mcp/brainReadonlyHandlers.ts",
  "src/mcp/brainMcpDbLoader.ts",
  "scripts/brain-mcp-server.mjs",
];

describe("brainMcpForbidden", () => {
  beforeEach(() => {
    useGraphStore.getState().setGraph(SHOWCASE_GRAPH_SNAPSHOT);
    useCognitiveActionStore.getState().clear();
  });

  it("each forbidden tool invoke fails closed without side effects", async () => {
    const graphBeforeNodes = structuredClone(useGraphStore.getState().nodes);
    const graphBeforeEdges = structuredClone(useGraphStore.getState().edges);
    const actionsBefore = structuredClone(useCognitiveActionStore.getState().actions);

    const server = createBrainMcpServer({
      mode: "read_only",
      deps: {
        loadGraph: async () => useGraphStore.getState(),
        loadUserProfile: async () => DEFAULT_USER_PROFILE,
      },
    });

    for (const toolName of MCP_FORBIDDEN_TOOLS) {
      await expect(invokeBrainMcpTool(server, toolName, {})).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof BrainMcpForbiddenError || error instanceof BrainMcpToolNotFoundError,
      );
    }

    expect(useGraphStore.getState().nodes).toEqual(graphBeforeNodes);
    expect(useGraphStore.getState().edges).toEqual(graphBeforeEdges);
    expect(useCognitiveActionStore.getState().actions).toEqual(actionsBefore);
  });

  it("MCP source does not register forbidden tools or graph/action write paths", () => {
    for (const relativePath of MCP_SOURCE_FILES) {
      const source = readRepoSource(relativePath);
      for (const forbidden of MCP_FORBIDDEN_TOOLS) {
        expect(source).not.toMatch(new RegExp(`registerTool\\([^)]*['"]${forbidden}['"]`));
        expect(source).not.toMatch(new RegExp(`['"]${forbidden}['"]\\s*,\\s*createReadHandler`));
        expect(source).not.toMatch(
          new RegExp(`name:\\s*['"]${forbidden}['"]`, "m"),
        );
      }
      expect(source).not.toContain("applyGraphMutation");
      expect(source).not.toContain("ingestActions");
      expect(source).not.toContain("confirmAction");
      expect(source).not.toContain("proposalStore.approve");
    }
  });

  it("web dev storage middleware is documented as dev-only, not MCP", () => {
    const plugin = readRepoSource("vite-plugin-my-brain-storage.ts");
    const webStorage = readRepoSource("src/storage/adapters/webSqlStorage.ts");
    expect(plugin).toMatch(/Web-dev-only|web-dev-only/i);
    expect(plugin).not.toContain("brain_create_node");
    expect(webStorage).toMatch(/Dev-only|dev-only/i);
  });

  it("stdio brain-mcp script lists only F1 read catalog tools", () => {
    const source = readRepoSource("scripts/brain-mcp-server.mjs");
    expect(source).toContain("BrainMcpToolCatalog");
    expect(source).toContain("MY_BRAIN_MCP");
    expect(source).toContain("loadGraphFromBrainDb");
    expect(source).not.toContain("brain_create_node");
    expect(source).not.toContain("brain_profile_digest");
    expect(source).not.toMatch(/['"]brain_search['"]/);
    expect(source).toContain("brain_search_nodes");
  });

  it("stdio loader module filters edges.archived", () => {
    const loader = readRepoSource("src/mcp/brainMcpDbLoader.ts");
    expect(loader).toMatch(/relation_type AS relationType,\s*archived/s);
    expect(loader).toMatch(/!edge\.archived/);
  });

  it("unknown write-like tool names are not found", async () => {
    const server = createBrainMcpServer({
      mode: "read_only",
      deps: {
        loadGraph: async () => SHOWCASE_GRAPH_SNAPSHOT,
        loadUserProfile: async () => DEFAULT_USER_PROFILE,
      },
    });

    await expect(invokeBrainMcpTool(server, "brain_create_node", {})).rejects.toBeInstanceOf(
      BrainMcpForbiddenError,
    );
    await expect(invokeBrainMcpTool(server, "brain_legacy_write", {})).rejects.toBeInstanceOf(
      BrainMcpToolNotFoundError,
    );
  });
});
