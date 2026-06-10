import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson, normalizeBrainGraphSnapshot } from "@/export/importGraphJson";
import { isConceptNode, isSkillNode } from "@/domain/graph";
import { createSkillNode } from "@/domain/nodes/skillNode";
import { autoCurate } from "@/agent/curation/autoCurate";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import { createTempStorage } from "@/invariants/testStorage";
import {
  applyGraphSchemaMigrationsSqlite,
  GRAPH_SCHEMA_VERSION_LATEST,
  GRAPH_SCHEMA_VERSION_WITH_SKILL,
  readGraphSchemaVersionSqlite,
} from "@/storage/schemaMigrations";

function harnessSkillNode(id = "skill-test-1") {
  return createSkillNode({
    id,
    name: "TypeScript 泛型",
    title: "TypeScript 泛型",
    intro: "复习目标",
    proficiency: "intermediate",
    reviewCadence: "weekly",
    sourceRefs: [],
    archived: false,
    createdAt: SHOWCASE_NOW,
    updatedAt: SHOWCASE_NOW,
  });
}

describe("graph.skill", () => {
  it("forward migration creates skills table at schema v6", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    const version = applyGraphSchemaMigrationsSqlite(db);
    expect(version).toBe(GRAPH_SCHEMA_VERSION_WITH_SKILL);
    expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_LATEST);
    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'skills'",
      )
      .get() as { name: string } | undefined;
    expect(table?.name).toBe("skills");
    db.close();
  });

  it("persists Skill nodes via storage saveSkill/loadGraph", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const skill = harnessSkillNode("skill-storage-1");
      await storage.saveSkill(skill);
      const graph = await storage.loadGraphForDisplay();
      const loaded = graph.nodes.find((node) => node.id === "skill-storage-1");
      expect(isSkillNode(loaded!)).toBe(true);
      if (isSkillNode(loaded!)) {
        expect(loaded.reviewCadence).toBe("weekly");
      }
    } finally {
      cleanup();
    }
  });

  it("export round-trips Skill nodeKind and fields", () => {
    const skill = harnessSkillNode("skill-export-1");
    const graph = {
      nodes: [...SHOWCASE_GRAPH_SNAPSHOT.nodes, skill],
      edges: SHOWCASE_GRAPH_SNAPSHOT.edges,
    };
    const exported = exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    const skillExport = exported.nodes.find((node) => node.id === "skill-export-1");
    expect(skillExport?.nodeKind).toBe("skill");
    expect(skillExport?.proficiency).toBe("intermediate");

    const imported = importGraphJson(exported);
    const roundTripped = imported.nodes.find((node) => node.id === "skill-export-1");
    expect(isSkillNode(roundTripped!)).toBe(true);
    expect(normalizeBrainGraphSnapshot({ nodes: [roundTripped!], edges: [] }).nodes[0]).toEqual(
      normalizeBrainGraphSnapshot({ nodes: [skill], edges: [] }).nodes[0],
    );
  });

  it("auto-curate never proposes create for Skill nodes", async () => {
    const concept = SHOWCASE_GRAPH_SNAPSHOT.nodes.find(isConceptNode)!;
    const proposals = await autoCurate(
      SHOWCASE_GRAPH_SNAPSHOT,
      concept,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.every((proposal) => proposal.kind !== "create")).toBe(true);
  });
});
