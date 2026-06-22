import type { GraphChangeRecord, GraphEdge, GraphNode, GraphSnapshot } from "../graph/types.js";
import {
  assertRemoteIngestGatePartition,
  isConfirmedIngestNode,
  partitionRemoteGraphNodes,
  remoteNodesToProvisional,
} from "./ingestGate.js";
import type { ProvisionalCandidate } from "../provisional/types.js";

function nodeMap(snapshot: GraphSnapshot): Map<string, GraphNode> {
  return new Map(snapshot.nodes.map((node) => [node.id, node]));
}

function edgeKey(edge: GraphEdge): string {
  return `${edge.fromId}:${edge.toId}:${edge.relation}`;
}

/**
 * Derive V4 edge-migrate targets from graph history (edge_migrated / auto_curate_merge).
 * Sync merge uses this when archived nodes still have live edges on either device.
 */
export function collectEdgeMigrationMap(
  histories: readonly GraphChangeRecord[],
): Map<string, string> {
  const map = new Map<string, string>();

  for (const record of histories) {
    if (record.kind === "auto_curate_merge") {
      const newlyArchived = record.before.nodes.filter(
        (before) =>
          !before.archived &&
          record.after.nodes.some((after) => after.id === before.id && after.archived),
      );
      const added = record.after.nodes.filter(
        (node) =>
          !node.archived && !record.before.nodes.some((before) => before.id === node.id),
      );
      if (newlyArchived.length === 1 && added.length === 1) {
        map.set(newlyArchived[0]!.id, added[0]!.id);
      }
      continue;
    }

    if (record.kind !== "edge_migrated") {
      continue;
    }

    for (const beforeEdge of record.before.edges) {
      const afterEdge = record.after.edges.find((edge) => edge.id === beforeEdge.id);
      if (!afterEdge) {
        continue;
      }
      if (beforeEdge.fromId !== afterEdge.fromId) {
        map.set(beforeEdge.fromId, afterEdge.fromId);
      }
      if (beforeEdge.toId !== afterEdge.toId) {
        map.set(beforeEdge.toId, afterEdge.toId);
      }
    }

    for (const beforeNode of record.before.nodes) {
      const afterNode = record.after.nodes.find((node) => node.id === beforeNode.id);
      if (afterNode?.archived && !beforeNode.archived) {
        for (const beforeEdge of record.before.edges) {
          if (beforeEdge.fromId !== beforeNode.id && beforeEdge.toId !== beforeNode.id) {
            continue;
          }
          const migrated = record.after.edges.find(
            (edge) =>
              edge.relation === beforeEdge.relation &&
              edge.fromId !== beforeNode.id &&
              edge.toId !== beforeNode.id,
          );
          if (migrated) {
            if (beforeEdge.fromId === beforeNode.id) {
              map.set(beforeNode.id, migrated.fromId);
            }
            if (beforeEdge.toId === beforeNode.id) {
              map.set(beforeNode.id, migrated.toId);
            }
          }
        }
      }
    }
  }

  return map;
}

function rewireEdgesForArchivedNodes(input: {
  edges: Iterable<GraphEdge>;
  archivedNodeIds: readonly string[];
  migrationMap: Map<string, string>;
  mergedNodes: Map<string, GraphNode>;
}): { edges: GraphEdge[]; migrationsApplied: number } {
  const archived = new Set(input.archivedNodeIds);
  const mergedEdges = new Map<string, GraphEdge>();
  let migrationsApplied = 0;

  for (const edge of input.edges) {
    let fromId = edge.fromId;
    let toId = edge.toId;

    if (archived.has(fromId)) {
      const target = input.migrationMap.get(fromId);
      if (target && input.mergedNodes.has(target) && !input.mergedNodes.get(target)!.archived) {
        fromId = target;
        migrationsApplied += 1;
      }
    }
    if (archived.has(toId)) {
      const target = input.migrationMap.get(toId);
      if (target && input.mergedNodes.has(target) && !input.mergedNodes.get(target)!.archived) {
        toId = target;
        migrationsApplied += 1;
      }
    }

    const from = input.mergedNodes.get(fromId);
    const to = input.mergedNodes.get(toId);
    if (!from || !to || from.archived || to.archived) {
      continue;
    }

    mergedEdges.set(edgeKey({ ...edge, fromId, toId }), { ...edge, fromId, toId });
  }

  return { edges: [...mergedEdges.values()], migrationsApplied };
}

/**
 * Merge graph snapshots — delete intent from remote becomes archive (never hard delete).
 * Unconfirmed remote nodes are routed to provisional, not permanent graph.
 */
export function mergeGraphSnapshots(input: {
  local: GraphSnapshot;
  remote: GraphSnapshot;
  remoteDeviceId: string;
  remoteDeletedNodeIds?: readonly string[];
  edgeMigrationHistory?: readonly GraphChangeRecord[];
}): {
  merged: GraphSnapshot;
  provisionalFromRemote: ProvisionalCandidate[];
  archivedNodeIds: string[];
  edgeMigrationsApplied: number;
} {
  const localById = nodeMap(input.local);
  const remoteById = nodeMap(input.remote);
  const archivedNodeIds: string[] = [];
  const mergedNodes = new Map<string, GraphNode>();

  for (const node of input.local.nodes) {
    mergedNodes.set(node.id, { ...node });
  }

  const remotePartition = partitionRemoteGraphNodes(input.remote.nodes);
  assertRemoteIngestGatePartition(remotePartition);
  const { confirmed, provisional } = remotePartition;
  for (const node of confirmed) {
    const existing = mergedNodes.get(node.id);
    if (existing) {
      if (existing.archived && !node.archived) {
        mergedNodes.set(node.id, { ...node, archived: false });
      } else if (!existing.archived && node.archived) {
        mergedNodes.set(node.id, { ...node, archived: true });
        archivedNodeIds.push(node.id);
      } else {
        mergedNodes.set(node.id, {
          ...existing,
          ...node,
          archived: existing.archived || node.archived,
        });
      }
    } else if (isConfirmedIngestNode(node)) {
      mergedNodes.set(node.id, { ...node });
    }
  }

  for (const deletedId of input.remoteDeletedNodeIds ?? []) {
    const existing = mergedNodes.get(deletedId);
    if (existing && !existing.archived) {
      mergedNodes.set(deletedId, { ...existing, archived: true });
      archivedNodeIds.push(deletedId);
    }
  }

  for (const [id, node] of remoteById) {
    if (node.archived && mergedNodes.has(id) && !mergedNodes.get(id)!.archived) {
      mergedNodes.set(id, { ...mergedNodes.get(id)!, archived: true });
      archivedNodeIds.push(id);
    }
  }

  const migrationMap = collectEdgeMigrationMap(input.edgeMigrationHistory ?? []);
  const uniqueArchived = [...new Set(archivedNodeIds)];
  const rewired = rewireEdgesForArchivedNodes({
    edges: [...input.local.edges, ...input.remote.edges],
    archivedNodeIds: uniqueArchived,
    migrationMap,
    mergedNodes,
  });

  return {
    merged: {
      nodes: [...mergedNodes.values()],
      edges: rewired.edges,
    },
    provisionalFromRemote: remoteNodesToProvisional(provisional, input.remoteDeviceId),
    archivedNodeIds: uniqueArchived,
    edgeMigrationsApplied: rewired.migrationsApplied,
  };
}

export function mergeGraphHistory(
  local: GraphChangeRecord[],
  remote: GraphChangeRecord[],
): GraphChangeRecord[] {
  const byId = new Map<string, GraphChangeRecord>();
  for (const record of [...local, ...remote]) {
    const existing = byId.get(record.id);
    if (!existing || existing.createdAt < record.createdAt) {
      byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function collectRemoteDeleteIntents(
  remoteHistory: GraphChangeRecord[],
): string[] {
  const deleted: string[] = [];
  for (const record of remoteHistory) {
    if (record.kind !== "node_archived") {
      continue;
    }
    for (const node of record.before.nodes) {
      const afterNode = record.after.nodes.find((n) => n.id === node.id);
      if (afterNode?.archived && !node.archived) {
        deleted.push(node.id);
      }
    }
  }
  return deleted;
}
