import type Database from "better-sqlite3";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";

function normalizeConceptRow(
  row: Omit<ConceptNode, "archived"> & { archived: number },
): ConceptNode {
  return {
    ...row,
    archived: row.archived === 1,
    salience: row.salience ?? undefined,
    lastTouchedAt: row.lastTouchedAt ?? undefined,
    archivedAt: row.archivedAt ?? undefined,
    supersedesNodeId: row.supersedesNodeId ?? undefined,
  };
}

function filterVisibleEdges(
  edges: GraphEdge[],
  endpointIds: Set<string>,
): GraphEdge[] {
  return edges.filter(
    (edge) =>
      !edge.archived &&
      endpointIds.has(edge.sourceId) &&
      endpointIds.has(edge.targetId),
  );
}

/** Read-only graph loader for stdio Brain MCP — aligns with storage visible-edge semantics. */
export function loadGraphFromBrainDb(db: Database.Database): BrainGraphSnapshot {
  const nodes = db
    .prepare(
      `SELECT id, title, intro, source_url AS sourceUrl, archived,
              created_at AS createdAt, updated_at AS updatedAt,
              salience, last_touched_at AS lastTouchedAt,
              archived_at AS archivedAt, supersedes_node_id AS supersedesNodeId
       FROM concepts`,
    )
    .all() as Array<Omit<ConceptNode, "archived"> & { archived: number }>;

  const edges = db
    .prepare(
      `SELECT id, source_id AS sourceId, target_id AS targetId,
              relation_type AS relationType, archived
       FROM edges`,
    )
    .all() as Array<Omit<GraphEdge, "archived"> & { archived: number }>;

  const conceptIds = new Set(nodes.map((node) => node.id));
  const normalizedEdges: GraphEdge[] = edges.map((row) => ({
    ...row,
    archived: row.archived === 1,
  }));

  const activeIds = new Set(
    nodes.filter((node) => node.archived !== 1).map((node) => node.id),
  );

  // Drop edges whose endpoints are missing from concepts (orphan guard).
  const edgesWithKnownEndpoints = normalizedEdges.filter(
    (edge) => conceptIds.has(edge.sourceId) && conceptIds.has(edge.targetId),
  );

  return {
    nodes: nodes
      .filter((node) => node.archived !== 1)
      .map((row) => normalizeConceptRow(row)),
    edges: filterVisibleEdges(edgesWithKnownEndpoints, activeIds),
  };
}
