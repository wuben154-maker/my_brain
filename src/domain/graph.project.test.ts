import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson, normalizeBrainGraphSnapshot } from "@/export/importGraphJson";
import { isProjectNode } from "@/domain/graph";
import { createProjectNode } from "@/domain/nodes/projectNode";
import {
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
  SHOWCASE_PROJECT_MCP_ID,
  SHOWCASE_PROJECT_VOICE_ID,
} from "@/showcase/showcaseFixtures";
import { createTempStorage } from "@/invariants/testStorage";
import {
  applyGraphSchemaMigrationsSqlite,
  GRAPH_SCHEMA_MIGRATION_STEPS,
  GRAPH_SCHEMA_VERSION_BASELINE,
  GRAPH_SCHEMA_VERSION_LATEST,
  readGraphSchemaVersionSqlite,
  rollbackGraphSchemaMigrationsSqlite,
} from "@/storage/schemaMigrations";

describe("graph.project", () => {
  it("forward migration creates projects table and bumps schema version", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_BASELINE);

    const version = applyGraphSchemaMigrationsSqlite(db);
    expect(version).toBe(GRAPH_SCHEMA_VERSION_LATEST);

    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
      )
      .get() as { name: string } | undefined;
    expect(table?.name).toBe("projects");
    db.close();
  });

  it("rollback migration drops projects table when hook exists", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    applyGraphSchemaMigrationsSqlite(db);
    const rolled = rollbackGraphSchemaMigrationsSqlite(
      db,
      GRAPH_SCHEMA_VERSION_BASELINE,
    );
    expect(rolled).toBe(GRAPH_SCHEMA_VERSION_BASELINE);
    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
      )
      .get();
    expect(table).toBeUndefined();
    db.close();
  });

  it("documents KP-10+ adds Source/Decision/Question/Skill migration steps after Project", () => {
    expect(GRAPH_SCHEMA_MIGRATION_STEPS).toHaveLength(5);
    expect(GRAPH_SCHEMA_MIGRATION_STEPS[0]?.description).toContain("KP-08");
    expect(GRAPH_SCHEMA_MIGRATION_STEPS[1]?.description).toContain("KP-10");
  });

  it("persists Project nodes via storage saveProject/loadGraph", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const project = createProjectNode({
        id: "proj-test-1",
        title: "Test Project",
        intro: "harness project",
        sourceRefs: [],
        archived: false,
        createdAt: SHOWCASE_NOW,
        updatedAt: SHOWCASE_NOW,
      });
      await storage.saveProject(project);
      const graph = await storage.loadGraphForDisplay();
      const loaded = graph.nodes.find((node) => node.id === "proj-test-1");
      expect(loaded).toBeDefined();
      expect(isProjectNode(loaded!)).toBe(true);
      expect(loaded!.title).toBe("Test Project");
    } finally {
      cleanup();
    }
  });

  it("used_in edge links concept to project in showcase graph", () => {
    const edge = SHOWCASE_GRAPH_SNAPSHOT.edges.find(
      (row) => row.relationType === "used_in",
    );
    expect(edge).toBeDefined();
    expect(edge!.targetId).toBe(SHOWCASE_PROJECT_VOICE_ID);
    const project = SHOWCASE_GRAPH_SNAPSHOT.nodes.find(
      (node) => node.id === SHOWCASE_PROJECT_VOICE_ID,
    );
    expect(isProjectNode(project!)).toBe(true);
  });

  it("export round-trips Project nodeKind and fields", () => {
    const exported = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, {
      exportedAt: SHOWCASE_NOW,
    });
    const projectExport = exported.nodes.find(
      (node) => node.id === SHOWCASE_PROJECT_MCP_ID,
    );
    expect(projectExport?.nodeKind).toBe("project");

    const imported = importGraphJson(exported);
    expect(normalizeBrainGraphSnapshot(imported)).toEqual(
      normalizeBrainGraphSnapshot(SHOWCASE_GRAPH_SNAPSHOT),
    );
  });
});
