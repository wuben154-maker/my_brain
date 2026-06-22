import type { GraphChangeRecord, GraphNode } from "../graph/types.js";

export type NodeDisplayState = "active" | "archived";

export interface NodeDisplayEnrichment {
  source: string;
  state: NodeDisplayState;
  recentChange: string | null;
  curationReason: string | null;
}

const CURATION_KINDS = new Set<GraphChangeRecord["kind"]>([
  "auto_curate_merge",
  "node_archived",
  "edge_created",
]);

function changeTouchesNode(change: GraphChangeRecord, nodeId: string): boolean {
  return (
    change.before.nodes.some((node) => node.id === nodeId) ||
    change.after.nodes.some((node) => node.id === nodeId)
  );
}

function formatSource(node: GraphNode): string {
  if (node.ingestSource?.trim()) {
    return node.ingestSource.trim();
  }
  if (node.sourceLinks.length > 0) {
    return node.sourceLinks[0] ?? "用户确认入库";
  }
  return "用户确认入库";
}

/** Enrich brain-map node with source, state, recent change, and curation reason. */
export function enrichNodeDisplay(
  node: GraphNode,
  history: GraphChangeRecord[],
): NodeDisplayEnrichment {
  const relevant = history
    .filter((change) => !change.undone && changeTouchesNode(change, node.id))
    .slice()
    .reverse();

  const recent = relevant[0] ?? null;
  const curation = relevant.find((change) => CURATION_KINDS.has(change.kind)) ?? null;

  return {
    source: formatSource(node),
    state: node.archived ? "archived" : "active",
    recentChange: recent?.summary ?? null,
    curationReason: curation?.summary ?? null,
  };
}
