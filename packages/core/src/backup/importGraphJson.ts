import type { GraphSnapshot } from "../graph/types.js";
import { ImportSchemaMismatch } from "./errors.js";

const GRAPH_EXPORT_SCHEMA = "my-brain-graph/1.0";

interface GraphExportJson {
  schemaVersion: string;
  nodes: GraphSnapshot["nodes"];
  edges: GraphSnapshot["edges"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parse / validate exported graph JSON into an in-memory snapshot.
 * Harness-only — does not write storage or perform full M7A restore.
 */
export function importGraphJson(json: unknown): GraphSnapshot {
  if (!isRecord(json)) {
    throw new ImportSchemaMismatch(1, 0);
  }

  const schemaVersion = json.schemaVersion;
  if (schemaVersion !== GRAPH_EXPORT_SCHEMA) {
    throw new ImportSchemaMismatch(1, typeof schemaVersion === "number" ? schemaVersion : 0);
  }

  if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
    throw new Error("Graph export must include nodes[] and edges[]");
  }

  return {
    nodes: json.nodes as GraphSnapshot["nodes"],
    edges: json.edges as GraphSnapshot["edges"],
  };
}

export function normalizeGraphSnapshot(graph: GraphSnapshot): GraphSnapshot {
  const nodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));
  return { nodes, edges };
}
