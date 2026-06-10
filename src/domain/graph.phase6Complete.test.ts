import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson } from "@/export/importGraphJson";
import {
  isDecisionNode,
  isProjectNode,
  isQuestionNode,
  isSkillNode,
  isSourceNode,
} from "@/domain/graph";
import { createDecisionNode } from "@/domain/nodes/decisionNode";
import { createQuestionNode } from "@/domain/nodes/questionNode";
import { createSkillNode } from "@/domain/nodes/skillNode";
import { createSourceNodeFromSourceRef } from "@/domain/nodes/sourceNode";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import {
  applyGraphSchemaMigrationsSqlite,
  GRAPH_SCHEMA_MIGRATION_STEPS,
  GRAPH_SCHEMA_VERSION_LATEST,
} from "@/storage/schemaMigrations";

describe("graph.phase6Complete", () => {
  it("all Phase 6 migration steps register in order", () => {
    expect(GRAPH_SCHEMA_MIGRATION_STEPS.map((step) => step.version)).toEqual([
      2, 3, 4, 5, 6,
    ]);
    expect(GRAPH_SCHEMA_VERSION_LATEST).toBe(6);
  });

  it("Concept+Project+Source+Decision+Question+Skill coexist in export round-trip", () => {
    const project = SHOWCASE_GRAPH_SNAPSHOT.nodes.find(isProjectNode)!;
    const source = createSourceNodeFromSourceRef(
      {
        title: "Phase6 Source",
        url: "https://example.com/p6",
        kind: "manual",
        ingestedAt: SHOWCASE_NOW,
      },
      { id: "src-p6", createdAt: SHOWCASE_NOW, updatedAt: SHOWCASE_NOW },
    );
    const decision = createDecisionNode({
      id: "dec-p6",
      title: "Pick local-first",
      rationale: "privacy",
      alternativesConsidered: ["cloud"],
      sourceRefs: [],
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    });
    const question = createQuestionNode({
      id: "q-p6",
      title: "How to rank?",
      prompt: "How to rank?",
      context: "",
      status: "open",
      sourceRefs: [],
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    });
    const skill = createSkillNode({
      id: "skill-p6",
      name: "Graph curation",
      title: "Graph curation",
      intro: "",
      proficiency: "beginner",
      reviewCadence: "monthly",
      sourceRefs: [],
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    });

    const graph = {
      nodes: [
        ...SHOWCASE_GRAPH_SNAPSHOT.nodes.filter(
          (node) => node.id !== project.id,
        ),
        project,
        source,
        decision,
        question,
        skill,
      ],
      edges: SHOWCASE_GRAPH_SNAPSHOT.edges,
    };

    const exported = exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    const kinds = new Set(exported.nodes.map((node) => node.nodeKind ?? "concept"));
    expect(kinds.has("project")).toBe(true);
    expect(kinds.has("source")).toBe(true);
    expect(kinds.has("decision")).toBe(true);
    expect(kinds.has("question")).toBe(true);
    expect(kinds.has("skill")).toBe(true);

    const imported = importGraphJson(exported);
    expect(imported.nodes.some(isProjectNode)).toBe(true);
    expect(imported.nodes.some(isSourceNode)).toBe(true);
    expect(imported.nodes.some(isDecisionNode)).toBe(true);
    expect(imported.nodes.some(isQuestionNode)).toBe(true);
    expect(imported.nodes.some(isSkillNode)).toBe(true);
  });

  it("baseline concept graph migrates forward through Phase 6", () => {
    const db = new Database(":memory:");
    db.exec(
      "CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    expect(applyGraphSchemaMigrationsSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_LATEST);
    db.close();
  });
});
