import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson, normalizeBrainGraphSnapshot } from "@/export/importGraphJson";
import { isConceptNode, isSourceNode } from "@/domain/graph";
import {
  createSourceNode,
  createSourceNodeFromSourceRef,
  sourceNodeToSourceRef,
} from "@/domain/nodes/sourceNode";
import type { SourceRef } from "@/domain/graph/sourceRef";
import { autoCurate } from "@/agent/curation/autoCurate";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  createBrainMcpServer,
  invokeBrainMcpTool,
  sanitizeMcpNode,
  type BrainMcpNodeView,
} from "@/mcp/brainMcpServer";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import { createTempStorage } from "@/invariants/testStorage";
import {
  applyGraphSchemaMigrationsSqlite,
  GRAPH_SCHEMA_MIGRATION_STEPS,
  GRAPH_SCHEMA_VERSION_LATEST,
  GRAPH_SCHEMA_VERSION_WITH_PROJECT,
  GRAPH_SCHEMA_VERSION_WITH_SOURCE,
  readGraphSchemaVersionSqlite,
  rollbackGraphSchemaMigrationsSqlite,
} from "@/storage/schemaMigrations";

const SAMPLE_SOURCE_REF: SourceRef = {
  url: "https://example.com/graphiti",
  title: "Graphiti 时序知识图谱",
  kind: "briefing",
  worldItemId: "radar-wi-showcase-3",
  ingestedAt: SHOWCASE_NOW,
};

function harnessSourceNode(id = "src-graphiti") {
  return createSourceNodeFromSourceRef(SAMPLE_SOURCE_REF, {
    id,
    intro: "canonical source object",
    createdAt: SHOWCASE_NOW,
    updatedAt: SHOWCASE_NOW,
  });
}

describe("graph.source", () => {
  it("forward migration creates sources table at schema v3", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    const version = applyGraphSchemaMigrationsSqlite(db);
    expect(version).toBe(GRAPH_SCHEMA_VERSION_LATEST);
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_LATEST);

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sources'",
      )
      .get() as { name: string } | undefined;
    expect(table?.name).toBe("sources");
    db.close();
  });

  it("rollback from v3 to v1 drops sources table and keeps projects", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    applyGraphSchemaMigrationsSqlite(db);
    rollbackGraphSchemaMigrationsSqlite(db, GRAPH_SCHEMA_VERSION_WITH_PROJECT);
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_WITH_PROJECT);

    const sources = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sources'",
      )
      .get();
    expect(sources).toBeUndefined();

    const projects = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
      )
      .get() as { name: string } | undefined;
    expect(projects?.name).toBe("projects");
    db.close();
  });

  it("registers graph schema steps through Phase 6 Skill", () => {
    expect(GRAPH_SCHEMA_MIGRATION_STEPS.map((step) => step.version)).toEqual([
      GRAPH_SCHEMA_VERSION_WITH_PROJECT,
      GRAPH_SCHEMA_VERSION_WITH_SOURCE,
      4,
      5,
      6,
    ]);
  });

  it("persists Source nodes via storage saveSource/loadGraph", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const source = harnessSourceNode("src-test-1");
      await storage.saveSource(source);
      const graph = await storage.loadGraphForDisplay();
      const loaded = graph.nodes.find((node) => node.id === "src-test-1");
      expect(loaded).toBeDefined();
      expect(isSourceNode(loaded!)).toBe(true);
      if (isSourceNode(loaded!)) {
        expect(loaded.title).toBe(SAMPLE_SOURCE_REF.title);
        expect(loaded.url).toBe(SAMPLE_SOURCE_REF.url);
      }
    } finally {
      cleanup();
    }
  });

  it("Concept.sourceRefs can link to Source node via sourceNodeId (KOS-D1)", () => {
    const source = harnessSourceNode("src-kos-d1");
    const ref: SourceRef = {
      ...sourceNodeToSourceRef(source),
      sourceNodeId: source.id,
    };
    expect(ref.sourceNodeId).toBe("src-kos-d1");
    expect(ref.url).toBe(SAMPLE_SOURCE_REF.url);
  });

  it("export round-trips Source nodeKind and provenance fields", () => {
    const source = harnessSourceNode("src-export-1");
    const graph = {
      nodes: [...SHOWCASE_GRAPH_SNAPSHOT.nodes, source],
      edges: SHOWCASE_GRAPH_SNAPSHOT.edges,
    };
    const exported = exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    const sourceExport = exported.nodes.find((node) => node.id === "src-export-1");
    expect(sourceExport?.nodeKind).toBe("source");
    expect(sourceExport?.sourceRefs[0]?.sourceNodeId).toBe("src-export-1");

    const imported = importGraphJson(exported);
    const roundTripped = imported.nodes.find((node) => node.id === "src-export-1");
    expect(isSourceNode(roundTripped!)).toBe(true);
    expect(normalizeBrainGraphSnapshot({ nodes: [roundTripped!], edges: [] }).nodes[0]).toEqual(
      normalizeBrainGraphSnapshot({ nodes: [source], edges: [] }).nodes[0],
    );
  });

  it("MCP read exposes Source shape; write tools remain forbidden", async () => {
    const source = harnessSourceNode("src-mcp-1");
    const view = sanitizeMcpNode(source);
    expect(view.nodeKind).toBe("source");
    expect(view.sourceRefs[0]?.sourceNodeId).toBe("src-mcp-1");

    const server = createBrainMcpServer({
      mode: "read_only",
      deps: {
        loadGraph: async () => ({
          nodes: [source],
          edges: [],
        }),
        loadUserProfile: async () => DEFAULT_USER_PROFILE,
      },
    });

    const node = (await invokeBrainMcpTool(server, "brain_get_node", {
      nodeId: "src-mcp-1",
    })) as BrainMcpNodeView | null;
    expect(node?.nodeKind).toBe("source");
    expect(node?.sourceRefs[0]?.url).toBe(SAMPLE_SOURCE_REF.url);

    await expect(
      invokeBrainMcpTool(server, "brain_create_node", { title: "x" }),
    ).rejects.toBeInstanceOf(Error);
  });

  it("auto-curate never proposes create for Source nodes", async () => {
    const concept = SHOWCASE_GRAPH_SNAPSHOT.nodes.find(isConceptNode)!;
    const proposals = await autoCurate(
      SHOWCASE_GRAPH_SNAPSHOT,
      concept,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.every((proposal) => proposal.kind !== "create")).toBe(true);
    expect(
      proposals.every(
        (proposal) =>
          !String(proposal.payload.nodeKind ?? "").includes("source"),
      ),
    ).toBe(true);
  });

  it("createSourceNode rejects silent AI path — only explicit factory", () => {
    const explicit = createSourceNode({
      id: "src-explicit",
      title: "Manual Source",
      intro: "",
      url: null,
      kind: "manual",
      ingestedAt: SHOWCASE_NOW,
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    });
    expect(explicit.nodeKind).toBe("source");
  });
});
