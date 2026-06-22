import type { GraphEdge, GraphNode, GraphSnapshot } from "../graph/types.js";
import type { CurationAction } from "./types.js";

function cloneSnapshot(snapshot: GraphSnapshot): GraphSnapshot {
  return {
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      sourceLinks: [...node.sourceLinks],
    })),
    edges: snapshot.edges.map((edge) => ({ ...edge })),
  };
}

function findNode(nodes: GraphNode[], nodeId: string): GraphNode | undefined {
  return nodes.find((node) => node.id === nodeId);
}

function migrateEdges(
  edges: GraphEdge[],
  fromNodeId: string,
  toNodeId: string,
  seq: { value: number },
): GraphEdge[] {
  const next: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    let fromId = edge.fromId;
    let toId = edge.toId;
    if (fromId === fromNodeId) {
      fromId = toNodeId;
    }
    if (toId === fromNodeId) {
      toId = toNodeId;
    }
    if (fromId === toId) {
      continue;
    }
    const key = `${fromId}:${toId}:${edge.relation}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    seq.value += 1;
    next.push({
      id: `edge-${seq.value}`,
      fromId,
      toId,
      relation: edge.relation,
    });
  }

  return next;
}

function nextEdgeId(seq: { value: number }): string {
  seq.value += 1;
  return `edge-${seq.value}`;
}

function hasEdge(
  edges: GraphEdge[],
  fromId: string,
  toId: string,
  relation: string,
): boolean {
  return edges.some(
    (edge) =>
      edge.fromId === fromId && edge.toId === toId && edge.relation === relation,
  );
}

/** Pure snapshot transform — never creates new concept nodes. */
export function applyCurationAction(
  snapshot: GraphSnapshot,
  action: CurationAction,
): GraphSnapshot {
  const next = cloneSnapshot(snapshot);
  const seq = { value: next.edges.length };

  switch (action.kind) {
    case "merge": {
      const source = findNode(next.nodes, action.sourceNodeId);
      const target = findNode(next.nodes, action.targetNodeId);
      if (!source || !target || source.archived || target.archived) {
        return snapshot;
      }
      source.archived = true;
      target.intro = action.mergedIntro.trim() || target.intro;
      next.edges = migrateEdges(
        next.edges,
        action.sourceNodeId,
        action.targetNodeId,
        seq,
      );
      break;
    }
    case "link": {
      const source = findNode(next.nodes, action.fromId);
      const target = findNode(next.nodes, action.toId);
      if (
        !source ||
        !target ||
        source.archived ||
        target.archived ||
        action.fromId === action.toId ||
        hasEdge(next.edges, action.fromId, action.toId, action.relation)
      ) {
        return snapshot;
      }
      next.edges.push({
        id: nextEdgeId(seq),
        fromId: action.fromId,
        toId: action.toId,
        relation: action.relation,
      });
      break;
    }
    case "archive": {
      const node = findNode(next.nodes, action.nodeId);
      if (!node || node.archived) {
        return snapshot;
      }
      if (action.migrateEdgesToNodeId) {
        const migrateTarget = findNode(next.nodes, action.migrateEdgesToNodeId);
        if (
          !migrateTarget ||
          migrateTarget.archived ||
          action.migrateEdgesToNodeId === action.nodeId
        ) {
          return snapshot;
        }
        next.edges = migrateEdges(
          next.edges,
          action.nodeId,
          action.migrateEdgesToNodeId,
          seq,
        );
      }
      node.archived = true;
      break;
    }
  }

  return next;
}

export function applyCurationPlan(
  snapshot: GraphSnapshot,
  actions: CurationAction[],
): GraphSnapshot {
  return actions.reduce(
    (working, action) => applyCurationAction(working, action),
    snapshot,
  );
}

export function snapshotsEqual(a: GraphSnapshot, b: GraphSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
