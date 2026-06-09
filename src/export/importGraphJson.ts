import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import {
  normalizeConceptProvenance,
  syncLegacySourceUrl,
} from "@/domain/graph/sourceRef";
import {
  parseGraphExportJson,
  type GraphExportJson,
} from "@/export/graphExportSchema";

function importNode(exported: GraphExportJson["nodes"][number]): ConceptNode {
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
    .map((node) => normalizeConceptProvenance(node))
    .sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));
  return { nodes, edges };
}
