import type { BrainGraphSnapshot } from "@/domain/graph";
import {
  GRAPH_EXPORT_SCHEMA_VERSION,
  sortGraphExportEdges,
  sortGraphExportNodes,
  toGraphExportEdge,
  toGraphExportNode,
  type GraphExportJson,
  type GraphExportOptions,
} from "@/export/graphExportSchema";

/**
 * Versioned JSON graph snapshot (field whitelist only).
 * Does not mutate the input graph.
 */
export function exportGraphJson(
  graph: BrainGraphSnapshot,
  options: GraphExportOptions = {},
): GraphExportJson {
  const exportedAt = options.exportedAt ?? new Date().toISOString();

  return {
    schemaVersion: GRAPH_EXPORT_SCHEMA_VERSION,
    exportedAt,
    nodes: sortGraphExportNodes(graph.nodes.map(toGraphExportNode)),
    edges: sortGraphExportEdges(graph.edges.map(toGraphExportEdge)),
  };
}
