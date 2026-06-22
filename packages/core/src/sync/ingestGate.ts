import type { GraphNode, GraphSnapshot } from "../graph/types.js";
import { createProvisionalCandidate } from "../provisional/queue.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import { SyncIngestGateViolation } from "./errors.js";

export const USER_CONFIRMED_INGEST = "user_confirmed_ingest";

export function isConfirmedIngestNode(node: GraphNode): boolean {
  if (node.archived) {
    return true;
  }
  return (
    node.ingestSource === USER_CONFIRMED_INGEST ||
    Boolean(node.confirmedAt && node.ingestSource)
  );
}

export function partitionRemoteGraphNodes(nodes: GraphNode[]): {
  confirmed: GraphNode[];
  provisional: GraphNode[];
  rejected: GraphNode[];
} {
  const confirmed: GraphNode[] = [];
  const provisional: GraphNode[] = [];
  const rejected: GraphNode[] = [];

  for (const node of nodes) {
    if (node.archived) {
      confirmed.push(node);
      continue;
    }
    if (isConfirmedIngestNode(node)) {
      confirmed.push(node);
      continue;
    }
    if (!node.ingestSource && !node.confirmedAt) {
      provisional.push(node);
      continue;
    }
    rejected.push(node);
  }

  return { confirmed, provisional, rejected };
}

export function remoteNodesToProvisional(
  nodes: GraphNode[],
  deviceId: string,
): ProvisionalCandidate[] {
  return nodes.map((node) => {
    const candidate = createProvisionalCandidate({
      sourceType: "text",
      summary: node.concept,
    });
    candidate.id = `sync-prov-${deviceId}-${node.id}`;
    candidate.status = "pending";
    candidate.ingestSource = "provisional_pending";
    candidate.evidenceRefs = [`sync:${deviceId}:${node.id}`];
    return candidate;
  });
}

/**
 * Remote nodes with partial ingest metadata bypass the confirm gate — structured stop.
 * Unconfirmed nodes without metadata are routed to provisional (see partitionRemoteGraphNodes).
 */
export function assertRemoteIngestGatePartition(partition: {
  rejected: GraphNode[];
}): void {
  if (partition.rejected.length > 0) {
    throw new SyncIngestGateViolation(partition.rejected.map((node) => node.id));
  }
}

export function assertMergedGraphIngestGate(snapshot: GraphSnapshot): void {
  const violations: string[] = [];
  for (const node of snapshot.nodes) {
    if (!node.archived && !isConfirmedIngestNode(node)) {
      violations.push(node.id);
    }
  }
  if (violations.length > 0) {
    throw new SyncIngestGateViolation(violations);
  }
}
