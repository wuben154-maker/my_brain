import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson, normalizeBrainGraphSnapshot } from "@/export/importGraphJson";
import { isConceptNode, isQuestionNode } from "@/domain/graph";
import { createQuestionNode } from "@/domain/nodes/questionNode";
import { autoCurate } from "@/agent/curation/autoCurate";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import { createTempStorage } from "@/invariants/testStorage";
import {
  applyGraphSchemaMigrationsSqlite,
  GRAPH_SCHEMA_VERSION_LATEST,
  GRAPH_SCHEMA_VERSION_WITH_QUESTION,
  GRAPH_SCHEMA_VERSION_WITH_DECISION,
  readGraphSchemaVersionSqlite,
  rollbackGraphSchemaMigrationsSqlite,
} from "@/storage/schemaMigrations";

function harnessQuestionNode(id = "q-test-1") {
  return createQuestionNode({
    id,
    title: "RAG 召回怎么做？",
    prompt: "RAG 召回怎么做？",
    context: "读论文时产生",
    status: "open",
    sourceRefs: [],
    archived: false,
    createdAt: SHOWCASE_NOW,
    updatedAt: SHOWCASE_NOW,
  });
}

describe("graph.question", () => {
  it("forward migration creates questions table", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    const version = applyGraphSchemaMigrationsSqlite(db);
    expect(version).toBe(GRAPH_SCHEMA_VERSION_LATEST);
    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'questions'",
      )
      .get() as { name: string } | undefined;
    expect(table?.name).toBe("questions");
    db.close();
  });

  it("rollback from v5 to v4 drops questions table", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    applyGraphSchemaMigrationsSqlite(db);
    rollbackGraphSchemaMigrationsSqlite(db, GRAPH_SCHEMA_VERSION_WITH_DECISION);
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_WITH_DECISION);
    const questions = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'questions'",
      )
      .get();
    expect(questions).toBeUndefined();
    db.close();
  });

  it("persists Question nodes via storage saveQuestion/loadGraph", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const question = harnessQuestionNode("q-storage-1");
      await storage.saveQuestion(question);
      const graph = await storage.loadGraphForDisplay();
      const loaded = graph.nodes.find((node) => node.id === "q-storage-1");
      expect(isQuestionNode(loaded!)).toBe(true);
      if (isQuestionNode(loaded!)) {
        expect(loaded.status).toBe("open");
      }
    } finally {
      cleanup();
    }
  });

  it("export round-trips Question nodeKind and fields", () => {
    const question = harnessQuestionNode("q-export-1");
    const graph = {
      nodes: [...SHOWCASE_GRAPH_SNAPSHOT.nodes, question],
      edges: SHOWCASE_GRAPH_SNAPSHOT.edges,
    };
    const exported = exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    const questionExport = exported.nodes.find((node) => node.id === "q-export-1");
    expect(questionExport?.nodeKind).toBe("question");
    expect(questionExport?.prompt).toBe("RAG 召回怎么做？");

    const imported = importGraphJson(exported);
    const roundTripped = imported.nodes.find((node) => node.id === "q-export-1");
    expect(isQuestionNode(roundTripped!)).toBe(true);
    expect(normalizeBrainGraphSnapshot({ nodes: [roundTripped!], edges: [] }).nodes[0]).toEqual(
      normalizeBrainGraphSnapshot({ nodes: [question], edges: [] }).nodes[0],
    );
  });

  it("auto-curate never proposes create for Question nodes", async () => {
    const concept = SHOWCASE_GRAPH_SNAPSHOT.nodes.find(isConceptNode)!;
    const proposals = await autoCurate(
      SHOWCASE_GRAPH_SNAPSHOT,
      concept,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.every((proposal) => proposal.kind !== "create")).toBe(true);
  });

  it("documents Question migration at v5", () => {
    expect(GRAPH_SCHEMA_VERSION_WITH_QUESTION).toBe(5);
  });
});
