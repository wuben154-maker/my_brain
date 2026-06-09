import type { BrainGraphSnapshot } from "@/domain/graph";

export interface GraphDiffSummary {
  addedNodeIds: string[];
  removedNodeIds: string[];
  addedEdgeIds: string[];
  removedEdgeIds: string[];
}

/** Compact before/after diff for graph history panel (pure, no I/O). */
export function summarizeGraphDiff(
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): GraphDiffSummary {
  const beforeNodeIds = new Set(before.nodes.map((node) => node.id));
  const afterNodeIds = new Set(after.nodes.map((node) => node.id));
  const beforeEdgeIds = new Set(before.edges.map((edge) => edge.id));
  const afterEdgeIds = new Set(after.edges.map((edge) => edge.id));

  return {
    addedNodeIds: [...afterNodeIds].filter((id) => !beforeNodeIds.has(id)),
    removedNodeIds: [...beforeNodeIds].filter((id) => !afterNodeIds.has(id)),
    addedEdgeIds: [...afterEdgeIds].filter((id) => !beforeEdgeIds.has(id)),
    removedEdgeIds: [...beforeEdgeIds].filter((id) => !afterEdgeIds.has(id)),
  };
}
