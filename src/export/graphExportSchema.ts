import type { BrainGraphSnapshot, GraphEdge, RelationType } from "@/domain/graph";
import type { SourceRef } from "@/domain/graph/sourceRef";
import { normalizeSourceRefs } from "@/domain/graph/sourceRef";

/** F2 — versioned graph export JSON schema identifier. */
export const GRAPH_EXPORT_SCHEMA_VERSION = "my-brain-graph/1.0" as const;

export type GraphExportSchemaVersion = typeof GRAPH_EXPORT_SCHEMA_VERSION;

const RELATION_TYPES = new Set<RelationType>([
  "is_a",
  "depends_on",
  "replaces",
  "related",
]);

export interface GraphExportNode {
  id: string;
  title: string;
  intro: string;
  archived: boolean;
  sourceRefs: SourceRef[];
  updatedAt: string;
}

export interface GraphExportEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
}

export interface GraphExportJson {
  schemaVersion: GraphExportSchemaVersion;
  exportedAt: string;
  nodes: GraphExportNode[];
  edges: GraphExportEdge[];
}

export interface GraphExportOptions {
  /** ISO timestamp for export envelope; defaults to `new Date().toISOString()`. */
  exportedAt?: string;
}

export class GraphImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphImportError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRelationType(value: unknown): RelationType | null {
  if (typeof value !== "string") {
    return null;
  }
  return RELATION_TYPES.has(value as RelationType) ? (value as RelationType) : null;
}

export function toGraphExportNode(
  node: BrainGraphSnapshot["nodes"][number],
): GraphExportNode {
  return {
    id: node.id,
    title: node.title,
    intro: node.intro,
    archived: node.archived,
    sourceRefs: normalizeSourceRefs(node.sourceRefs),
    updatedAt: node.updatedAt,
  };
}

export function toGraphExportEdge(edge: GraphEdge): GraphExportEdge {
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relationType: edge.relationType,
  };
}

export function parseGraphExportJson(raw: unknown): GraphExportJson {
  if (!isRecord(raw)) {
    throw new GraphImportError("Graph export JSON must be an object");
  }

  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== GRAPH_EXPORT_SCHEMA_VERSION) {
    throw new GraphImportError(
      `Unsupported schemaVersion: ${String(schemaVersion)} (expected ${GRAPH_EXPORT_SCHEMA_VERSION})`,
    );
  }

  const exportedAt = String(raw.exportedAt ?? "").trim();
  if (!exportedAt) {
    throw new GraphImportError("Graph export JSON missing exportedAt");
  }

  if (!Array.isArray(raw.nodes)) {
    throw new GraphImportError("Graph export JSON missing nodes array");
  }
  if (!Array.isArray(raw.edges)) {
    throw new GraphImportError("Graph export JSON missing edges array");
  }

  const nodes: GraphExportNode[] = [];
  for (const item of raw.nodes) {
    if (!isRecord(item)) {
      throw new GraphImportError("Graph export node must be an object");
    }
    const id = String(item.id ?? "").trim();
    const title = String(item.title ?? "").trim();
    const intro = String(item.intro ?? "");
    const updatedAt = String(item.updatedAt ?? "").trim();
    if (!id || !title || !updatedAt) {
      throw new GraphImportError("Graph export node missing required fields");
    }
    nodes.push({
      id,
      title,
      intro,
      archived: item.archived === true,
      sourceRefs: normalizeSourceRefs(item.sourceRefs),
      updatedAt,
    });
  }

  const edges: GraphExportEdge[] = [];
  for (const item of raw.edges) {
    if (!isRecord(item)) {
      throw new GraphImportError("Graph export edge must be an object");
    }
    const id = String(item.id ?? "").trim();
    const sourceId = String(item.sourceId ?? "").trim();
    const targetId = String(item.targetId ?? "").trim();
    const relationType = parseRelationType(item.relationType);
    if (!id || !sourceId || !targetId || !relationType) {
      throw new GraphImportError("Graph export edge missing required fields");
    }
    edges.push({ id, sourceId, targetId, relationType });
  }

  return {
    schemaVersion: GRAPH_EXPORT_SCHEMA_VERSION,
    exportedAt,
    nodes,
    edges,
  };
}

/** Stable ordering for round-trip / golden comparisons. */
export function sortGraphExportNodes(nodes: GraphExportNode[]): GraphExportNode[] {
  return [...nodes].sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
}

export function sortGraphExportEdges(edges: GraphExportEdge[]): GraphExportEdge[] {
  return [...edges].sort((a, b) => a.id.localeCompare(b.id));
}
