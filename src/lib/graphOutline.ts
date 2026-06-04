import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import { selectTeachingHighlights } from "@/conversation/selectTeachingHighlights";
import { visibleGraph } from "@/lib/graphMutations";

export interface OutlineTreeNode {
  node: ConceptNode;
  depth: number;
  children: OutlineTreeNode[];
}

function buildAdjacency(
  nodeIds: string[],
  edges: GraphEdge[],
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    adjacency.set(id, []);
  }
  const idSet = new Set(nodeIds);
  for (const edge of edges) {
    if (!idSet.has(edge.sourceId) || !idSet.has(edge.targetId)) {
      continue;
    }
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    adjacency.get(edge.targetId)?.push(edge.sourceId);
  }
  return adjacency;
}

function pickHighestDegreeRoot(
  nodeIds: string[],
  adjacency: Map<string, string[]>,
): string {
  const degree = (id: string) => adjacency.get(id)?.length ?? 0;
  return [...nodeIds].sort((a, b) => degree(b) - degree(a))[0]!;
}

function buildTreeFromRoot(
  rootId: string,
  nodeById: Map<string, ConceptNode>,
  adjacency: Map<string, string[]>,
  visited: Set<string>,
  depth: number,
): OutlineTreeNode {
  visited.add(rootId);
  const node = nodeById.get(rootId)!;
  const children: OutlineTreeNode[] = [];
  for (const neighbor of adjacency.get(rootId) ?? []) {
    if (visited.has(neighbor)) {
      continue;
    }
    children.push(
      buildTreeFromRoot(neighbor, nodeById, adjacency, visited, depth + 1),
    );
  }
  return { node, depth, children };
}

/**
 * Active (non-archived) concepts as a BFS forest from highest-degree hubs (N3).
 * Cycles cannot inflate the tree 鈥?each node appears at most once per component.
 */
export function buildGraphOutline(
  nodes: ConceptNode[],
  edges: GraphEdge[],
): OutlineTreeNode[] {
  const active = nodes.filter((node) => !node.archived);
  if (active.length === 0) {
    return [];
  }
  const nodeById = new Map(active.map((node) => [node.id, node]));
  const ids = active.map((node) => node.id);
  const adjacency = buildAdjacency(ids, edges);
  const visited = new Set<string>();
  const forest: OutlineTreeNode[] = [];

  while (visited.size < ids.length) {
    const remaining = ids.filter((id) => !visited.has(id));
    const rootId = pickHighestDegreeRoot(remaining, adjacency);
    forest.push(buildTreeFromRoot(rootId, nodeById, adjacency, visited, 0));
  }

  return forest;
}

function orderWalkthroughPath(
  nodeIds: string[],
  edges: GraphEdge[],
): string[] {
  if (nodeIds.length <= 1) {
    return nodeIds;
  }
  const remaining = new Set(nodeIds.slice(1));
  const ordered: string[] = [nodeIds[0]!];

  while (remaining.size > 0) {
    const last = ordered[ordered.length - 1]!;
    let next: string | null = null;
    for (const edge of edges) {
      if (edge.sourceId === last && remaining.has(edge.targetId)) {
        next = edge.targetId;
        break;
      }
      if (edge.targetId === last && remaining.has(edge.sourceId)) {
        next = edge.sourceId;
        break;
      }
    }
    if (next === null) {
      next = remaining.values().next().value ?? null;
    }
    if (next === null) {
      break;
    }
    ordered.push(next);
    remaining.delete(next);
  }

  return ordered;
}

/** Ordered node ids for teaching walkthrough along graph edges (V6). */
export function planWalkthrough(
  topic: string,
  graph: BrainGraphSnapshot,
): string[] {
  const active = visibleGraph(graph).nodes;
  let highlights = selectTeachingHighlights(graph, topic);
  const trimmed = topic.trim().toLowerCase();
  const titleMatched =
    trimmed.length > 0 &&
    active.some((node) => {
      const title = node.title.toLowerCase();
      return title.includes(trimmed) || (trimmed.includes(title) && title.length >= 3);
    });
  if (!titleMatched && active.length > 0) {
    highlights = active.map((node) => node.id);
  }
  return orderWalkthroughPath(highlights, graph.edges);
}
