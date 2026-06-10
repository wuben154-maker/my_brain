import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import { createDecisionNode } from "@/domain/nodes/decisionNode";
import { createProjectNode } from "@/domain/nodes/projectNode";
import { createQuestionNode } from "@/domain/nodes/questionNode";
import { createSkillNode } from "@/domain/nodes/skillNode";
import {
  createSourceNodeFromSourceRef,
} from "@/domain/nodes/sourceNode";
import {
  normalizeConceptProvenance,
  normalizeSourceRef,
  syncLegacySourceUrl,
} from "@/domain/graph/sourceRef";
import {
  parseGraphExportJson,
  type GraphExportJson,
} from "@/export/graphExportSchema";

function importConceptNode(
  exported: GraphExportJson["nodes"][number],
): ConceptNode {
  const sourceRefs = exported.sourceRefs;
  const base: ConceptNode = {
    id: exported.id,
    title: exported.title,
    intro: exported.intro,
    archived: exported.archived,
    sourceRefs,
    sourceUrl: syncLegacySourceUrl(sourceRefs, null),
    createdAt: exported.updatedAt,
    updatedAt: exported.updatedAt,
  };
  return normalizeConceptProvenance(base);
}

function importNode(exported: GraphExportJson["nodes"][number]) {
  if (exported.nodeKind === "project") {
    return createProjectNode({
      id: exported.id,
      title: exported.title,
      intro: exported.intro,
      archived: exported.archived,
      sourceRefs: exported.sourceRefs,
      createdAt: exported.updatedAt,
      updatedAt: exported.updatedAt,
    });
  }
  if (exported.nodeKind === "source") {
    const ref =
      normalizeSourceRef(exported.sourceRefs[0]) ??
      normalizeSourceRef({
        title: exported.title,
        url: null,
        kind: "manual",
        ingestedAt: exported.updatedAt,
      });
    if (!ref) {
      throw new Error(`Graph export source node ${exported.id} missing sourceRefs`);
    }
    return createSourceNodeFromSourceRef(ref, {
      id: exported.id,
      intro: exported.intro,
      archived: exported.archived,
      createdAt: exported.updatedAt,
      updatedAt: exported.updatedAt,
    });
  }
  if (exported.nodeKind === "decision") {
    return createDecisionNode({
      id: exported.id,
      title: exported.title,
      rationale: exported.rationale ?? exported.intro,
      alternativesConsidered: exported.alternativesConsidered ?? [],
      archived: exported.archived,
      sourceRefs: exported.sourceRefs,
      createdAt: exported.updatedAt,
      updatedAt: exported.updatedAt,
    });
  }
  if (exported.nodeKind === "question") {
    return createQuestionNode({
      id: exported.id,
      title: exported.title,
      prompt: exported.prompt ?? exported.title,
      context: exported.context ?? exported.intro,
      status: exported.questionStatus ?? "open",
      archived: exported.archived,
      sourceRefs: exported.sourceRefs,
      createdAt: exported.updatedAt,
      updatedAt: exported.updatedAt,
    });
  }
  if (exported.nodeKind === "skill") {
    return createSkillNode({
      id: exported.id,
      name: exported.name ?? exported.title,
      title: exported.title,
      intro: exported.intro,
      proficiency: exported.proficiency ?? "",
      reviewCadence: exported.reviewCadence ?? "",
      archived: exported.archived,
      sourceRefs: exported.sourceRefs,
      createdAt: exported.updatedAt,
      updatedAt: exported.updatedAt,
    });
  }
  return importConceptNode(exported);
}

/**
 * Parse / validate / normalize exported JSON into an in-memory graph snapshot.
 * Harness-only — does not write store or database.
 */
export function importGraphJson(json: unknown): BrainGraphSnapshot {
  const parsed = parseGraphExportJson(json);
  return {
    nodes: parsed.nodes.map(importNode),
    edges: parsed.edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationType: edge.relationType,
    })),
  };
}

/** Stable ordering for round-trip deepEqual (spec allows field order normalization). */
export function normalizeBrainGraphSnapshot(
  graph: BrainGraphSnapshot,
): BrainGraphSnapshot {
  const nodes = [...graph.nodes]
    .map((node) => {
      if (
        node.nodeKind === "project" ||
        node.nodeKind === "source" ||
        node.nodeKind === "decision" ||
        node.nodeKind === "question" ||
        node.nodeKind === "skill"
      ) {
        return node;
      }
      return normalizeConceptProvenance(node);
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));
  return { nodes, edges };
}
