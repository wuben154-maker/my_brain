import type { GraphEdge, GraphNode, GraphRepository, GraphSnapshot } from "../graph/types.js";
import { M5_VISIBLE_NODE_BUDGET } from "./types.js";

export interface M5GraphCandidateSlice {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalVisibleNodes: number;
  aggregated: boolean;
}

function cloneNode(node: GraphNode): GraphNode {
  return { ...node, sourceLinks: [...node.sourceLinks] };
}

function cloneEdge(edge: GraphEdge): GraphEdge {
  return { ...edge };
}

/** Bounded node/edge slice for M5 experience generation — avoids full-library mounts. */
export function selectM5GraphCandidates(
  nodes: GraphNode[],
  edges: GraphEdge[],
  budget = M5_VISIBLE_NODE_BUDGET,
): M5GraphCandidateSlice {
  const visible = nodes.filter((node) => !node.archived);
  const totalVisibleNodes = visible.length;
  if (visible.length <= budget) {
    const ids = new Set(visible.map((node) => node.id));
    return {
      nodes: visible.map(cloneNode),
      edges: edges.filter((edge) => ids.has(edge.fromId) && ids.has(edge.toId)).map(cloneEdge),
      totalVisibleNodes,
      aggregated: false,
    };
  }

  const selected = [...visible]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, budget)
    .map(cloneNode);
  const ids = new Set(selected.map((node) => node.id));
  return {
    nodes: selected,
    edges: edges.filter((edge) => ids.has(edge.fromId) && ids.has(edge.toId)).map(cloneEdge),
    totalVisibleNodes,
    aggregated: true,
  };
}

export function getM5GraphCandidatesFromRepository(
  graph: GraphRepository,
  budget = M5_VISIBLE_NODE_BUDGET,
): M5GraphCandidateSlice {
  const totalVisibleNodes = graph.countVisibleNodes();
  if (totalVisibleNodes <= budget && "getM5CandidateSnapshot" in graph) {
    const snapshot = (
      graph as GraphRepository & { getM5CandidateSnapshot: (limit?: number) => GraphSnapshot }
    ).getM5CandidateSnapshot(budget);
    return {
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      totalVisibleNodes,
      aggregated: false,
    };
  }
  if ("getM5CandidateSnapshot" in graph) {
    const snapshot = (
      graph as GraphRepository & { getM5CandidateSnapshot: (limit?: number) => GraphSnapshot }
    ).getM5CandidateSnapshot(budget);
    return {
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      totalVisibleNodes,
      aggregated: totalVisibleNodes > budget,
    };
  }
  const snapshot = graph.getSnapshot();
  return selectM5GraphCandidates(snapshot.nodes, snapshot.edges, budget);
}
