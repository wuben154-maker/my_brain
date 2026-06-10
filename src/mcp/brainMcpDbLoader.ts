import type Database from "better-sqlite3";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import { createProjectNode } from "@/domain/nodes/projectNode";
import { createSourceNode } from "@/domain/nodes/sourceNode";
import type { SourceRefKind } from "@/domain/graph/sourceRef";
import { parseSourceRefsJson } from "@/domain/graph/sourceRef";

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
  const conceptRows = db
    .prepare(
      `SELECT id, title, intro, source_url AS sourceUrl, archived,
              created_at AS createdAt, updated_at AS updatedAt,
              salience, last_touched_at AS lastTouchedAt,
              archived_at AS archivedAt, supersedes_node_id AS supersedesNodeId
       FROM concepts`,
    )
    .all() as Array<Omit<ConceptNode, "archived"> & { archived: number }>;

  let projectRows: Array<
    Omit<ReturnType<typeof createProjectNode>, "nodeKind" | "archived" | "sourceRefs"> & {
      archived: number;
      sourceRefsJson?: string | null;
    }
  > = [];
  const projectsTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
    )
    .get() as { name: string } | undefined;
  if (projectsTable) {
    projectRows = db
      .prepare(
        `SELECT id, title, intro, source_refs_json AS sourceRefsJson,
                archived, created_at AS createdAt, updated_at AS updatedAt
         FROM projects`,
      )
      .all() as typeof projectRows;
  }

  let sourceRows: Array<
    Omit<ReturnType<typeof createSourceNode>, "nodeKind" | "archived"> & {
      archived: number;
    }
  > = [];
  const sourcesTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sources'",
    )
    .get() as { name: string } | undefined;
  if (sourcesTable) {
    sourceRows = db
      .prepare(
        `SELECT id, title, intro, url, kind, world_item_id AS worldItemId,
                ingested_at AS ingestedAt, archived,
                created_at AS createdAt, updated_at AS updatedAt
         FROM sources`,
      )
      .all() as typeof sourceRows;
  }

  const edges = db
    .prepare(
      `SELECT id, source_id AS sourceId, target_id AS targetId,
              relation_type AS relationType, archived
       FROM edges`,
    )
    .all() as Array<Omit<GraphEdge, "archived"> & { archived: number }>;

  const conceptNodes = conceptRows.map((row) => normalizeConceptRow(row));
  const projectNodes = projectRows.map((row) =>
    createProjectNode({
      id: row.id,
      title: row.title,
      intro: row.intro,
      sourceRefs: parseSourceRefsJson(row.sourceRefsJson),
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  );

  const sourceNodes = sourceRows.map((row) =>
    createSourceNode({
      id: row.id,
      title: row.title,
      intro: row.intro,
      url: row.url ?? null,
      kind: row.kind as SourceRefKind,
      ...(row.worldItemId ? { worldItemId: row.worldItemId } : {}),
      ingestedAt: row.ingestedAt,
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  );

  const nodes = [...conceptNodes, ...projectNodes, ...sourceNodes];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const normalizedEdges: GraphEdge[] = edges.map((row) => ({
    ...row,
    archived: row.archived === 1,
  }));

  const activeIds = new Set(
    nodes.filter((node) => !node.archived).map((node) => node.id),
  );

  const edgesWithKnownEndpoints = normalizedEdges.filter(
    (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
  );

  return {
    nodes: nodes.filter((node) => !node.archived),
    edges: filterVisibleEdges(edgesWithKnownEndpoints, activeIds),
  };
}
