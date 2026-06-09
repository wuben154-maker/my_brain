import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { createBrainMcpServer, invokeBrainMcpTool } from "@/mcp/brainMcpServer";
import { loadGraphFromBrainDb } from "@/mcp/brainMcpDbLoader";
import { brainNeighborhood } from "@/mcp/brainReadonlyHandlers";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createTempStorage } from "@/invariants/testStorage";
import { readRepoSource } from "@/invariants/readRepoSource";
import { visibleGraph } from "@/lib/graphMutations";

describe("brainMcpDbLoader", () => {
  it("stdio script delegates graph load to shared loader with archived edge filter", () => {
    const source = readRepoSource("scripts/brain-mcp-server.mjs");
    expect(source).toContain("loadGraphFromBrainDb");
    expect(source).not.toContain("function loadGraphFromDb");
  });

  it("loader selects edges.archived and hides soft-archived undo edges", async () => {
    const { storage, dbPath, cleanup } = createTempStorage("better-sqlite3");
    try {
      await storage.init();
      const nodeA = {
        id: "n-a",
        title: "Alpha",
        intro: "a",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      const nodeB = {
        id: "n-b",
        title: "Beta",
        intro: "b",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      await storage.saveConcept(nodeA);
      await storage.saveConcept(nodeB);
      await storage.saveEdge({
        id: "e-visible",
        sourceId: "n-a",
        targetId: "n-b",
        relationType: "related",
      });
      await storage.saveEdge({
        id: "e-undo-hidden",
        sourceId: "n-b",
        targetId: "n-a",
        relationType: "related",
      });

      await storage.syncEdgesSnapshot([
        {
          id: "e-visible",
          sourceId: "n-a",
          targetId: "n-b",
          relationType: "related",
        },
      ]);

      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const graph = loadGraphFromBrainDb(db);
        expect(graph.edges.map((edge) => edge.id)).toEqual(["e-visible"]);
      } finally {
        db.close();
      }

      const server = createBrainMcpServer({
        mode: "read_only",
        deps: {
          loadGraph: async () => {
            const dbRead = new Database(dbPath, { readonly: true, fileMustExist: true });
            try {
              return loadGraphFromBrainDb(dbRead);
            } finally {
              dbRead.close();
            }
          },
          loadUserProfile: async () => DEFAULT_USER_PROFILE,
        },
      });

      const neighborhood = (await invokeBrainMcpTool(server, "brain_node_neighborhood", {
        nodeId: "n-a",
        hops: 1,
      })) as { edges: Array<{ id: string }> };
      expect(neighborhood.edges.map((edge) => edge.id)).toEqual(["e-visible"]);
      expect(neighborhood.edges.some((edge) => edge.id === "e-undo-hidden")).toBe(false);
    } finally {
      await storage.close();
      cleanup();
    }
  });

  it("visibleGraph defense-in-depth also drops archived edges", async () => {
    const graph = {
      nodes: [
        {
          id: "a",
          title: "A",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "b",
          title: "B",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [
        {
          id: "e-live",
          sourceId: "a",
          targetId: "b",
          relationType: "related" as const,
        },
        {
          id: "e-archived",
          sourceId: "b",
          targetId: "a",
          relationType: "related" as const,
          archived: true,
        },
      ],
    };

    const visible = visibleGraph(graph);
    expect(visible.edges.map((edge) => edge.id)).toEqual(["e-live"]);

    const neighborhood = await brainNeighborhood("a", 1, {
      loadGraph: async () => graph,
      loadUserProfile: async () => DEFAULT_USER_PROFILE,
    });
    expect(neighborhood.edges.map((edge) => edge.id)).toEqual(["e-live"]);
  });
});
