import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson, normalizeBrainGraphSnapshot } from "@/export/importGraphJson";
import { isDecisionNode } from "@/domain/graph";
import { createDecisionNode } from "@/domain/nodes/decisionNode";
import { autoCurate } from "@/agent/curation/autoCurate";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  createBrainMcpServer,
  invokeBrainMcpTool,
  sanitizeMcpNode,
  type BrainMcpNodeView,
} from "@/mcp/brainMcpServer";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import { isConceptNode } from "@/domain/graph";
import { createTempStorage } from "@/invariants/testStorage";
import {
  applyGraphSchemaMigrationsSqlite,
  GRAPH_SCHEMA_MIGRATION_STEPS,
  GRAPH_SCHEMA_VERSION_LATEST,
  GRAPH_SCHEMA_VERSION_WITH_DECISION,
  GRAPH_SCHEMA_VERSION_WITH_SOURCE,
  readGraphSchemaVersionSqlite,
  rollbackGraphSchemaMigrationsSqlite,
} from "@/storage/schemaMigrations";

function harnessDecisionNode(id = "dec-test-1") {
  return createDecisionNode({
    id,
    title: "选用 SQLite 而非 Postgres",
    rationale: "本地优先，无需云端",
    alternativesConsidered: ["Postgres", "IndexedDB"],
    sourceRefs: [],
    archived: false,
    createdAt: SHOWCASE_NOW,
    updatedAt: SHOWCASE_NOW,
  });
}

describe("graph.decision", () => {
  it("forward migration creates decisions table at schema v4", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    const version = applyGraphSchemaMigrationsSqlite(db);
    expect(version).toBe(GRAPH_SCHEMA_VERSION_LATEST);
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_LATEST);

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'decisions'",
      )
      .get() as { name: string } | undefined;
    expect(table?.name).toBe("decisions");
    db.close();
  });

  it("rollback from v4 to v3 drops decisions table and keeps sources", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    applyGraphSchemaMigrationsSqlite(db);
    rollbackGraphSchemaMigrationsSqlite(db, GRAPH_SCHEMA_VERSION_WITH_SOURCE);
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_WITH_SOURCE);

    const decisions = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'decisions'",
      )
      .get();
    expect(decisions).toBeUndefined();

    const sources = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sources'",
      )
      .get() as { name: string } | undefined;
    expect(sources?.name).toBe("sources");
    db.close();
  });

  it("registers Decision migration step after Source", () => {
    const decisionStep = GRAPH_SCHEMA_MIGRATION_STEPS.find(
      (step) => step.version === GRAPH_SCHEMA_VERSION_WITH_DECISION,
    );
    expect(decisionStep?.description).toContain("KP-11");
  });

  it("persists Decision nodes via storage saveDecision/loadGraph", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const decision = harnessDecisionNode("dec-storage-1");
      await storage.saveDecision(decision);
      const graph = await storage.loadGraphForDisplay();
      const loaded = graph.nodes.find((node) => node.id === "dec-storage-1");
      expect(loaded).toBeDefined();
      expect(isDecisionNode(loaded!)).toBe(true);
      if (isDecisionNode(loaded!)) {
        expect(loaded.alternativesConsidered).toEqual(["Postgres", "IndexedDB"]);
      }
    } finally {
      cleanup();
    }
  });

  it("export round-trips Decision nodeKind and fields", () => {
    const decision = harnessDecisionNode("dec-export-1");
    const graph = {
      nodes: [...SHOWCASE_GRAPH_SNAPSHOT.nodes, decision],
      edges: SHOWCASE_GRAPH_SNAPSHOT.edges,
    };
    const exported = exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    const decisionExport = exported.nodes.find((node) => node.id === "dec-export-1");
    expect(decisionExport?.nodeKind).toBe("decision");
    expect(decisionExport?.rationale).toBe("本地优先，无需云端");

    const imported = importGraphJson(exported);
    const roundTripped = imported.nodes.find((node) => node.id === "dec-export-1");
    expect(isDecisionNode(roundTripped!)).toBe(true);
    expect(normalizeBrainGraphSnapshot({ nodes: [roundTripped!], edges: [] }).nodes[0]).toEqual(
      normalizeBrainGraphSnapshot({ nodes: [decision], edges: [] }).nodes[0],
    );
  });

  it("MCP read exposes Decision shape; write tools remain forbidden", async () => {
    const decision = harnessDecisionNode("dec-mcp-1");
    const view = sanitizeMcpNode(decision);
    expect(view.nodeKind).toBe("decision");
    expect(view.intro).toBe(decision.rationale);

    const server = createBrainMcpServer({
      mode: "read_only",
      deps: {
        loadGraph: async () => ({ nodes: [decision], edges: [] }),
        loadUserProfile: async () => DEFAULT_USER_PROFILE,
      },
    });

    const node = (await invokeBrainMcpTool(server, "brain_get_node", {
      nodeId: "dec-mcp-1",
    })) as BrainMcpNodeView | null;
    expect(node?.nodeKind).toBe("decision");

    await expect(
      invokeBrainMcpTool(server, "brain_create_node", { title: "x" }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("auto-curate never proposes create for Decision nodes", async () => {
    const concept = SHOWCASE_GRAPH_SNAPSHOT.nodes.find(isConceptNode)!;
    const proposals = await autoCurate(
      SHOWCASE_GRAPH_SNAPSHOT,
      concept,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.every((proposal) => proposal.kind !== "create")).toBe(true);
  });

  it("createDecisionNode rejects silent AI path — only explicit factory", () => {
    const explicit = createDecisionNode({
      id: "dec-explicit",
      title: "Manual Decision",
      rationale: "user confirmed",
      alternativesConsidered: [],
      sourceRefs: [],
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    });
    expect(explicit.nodeKind).toBe("decision");
  });
});
