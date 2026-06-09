import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";
import type { AutoCurateProposal } from "@/agent/curation/autoCurate";
import {
  readArchivePayload,
  readMergePayload,
} from "@/domain/graphMutationPayloads";
import type { EdgeMigrationRecord, GraphHistoryEntry } from "@/domain/graphHistory";

/** Edge ids present in after but not in before (added or replaced). */
export function computeAffectedEdgeIds(
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): string[] {
  const beforeIds = new Set(before.edges.map((edge) => edge.id));
  return after.edges.filter((edge) => !beforeIds.has(edge.id)).map((edge) => edge.id);
}

/** Record edges whose endpoint moved from fromNodeId to toNodeId during merge/archive. */
export function computeEdgeMigrations(
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
  fromNodeId: string,
  toNodeId: string,
): EdgeMigrationRecord[] {
  const migrations: EdgeMigrationRecord[] = [];
  for (const beforeEdge of before.edges) {
    if (beforeEdge.sourceId !== fromNodeId && beforeEdge.targetId !== fromNodeId) {
      continue;
    }
    const expectedSource =
      beforeEdge.sourceId === fromNodeId ? toNodeId : beforeEdge.sourceId;
    const expectedTarget =
      beforeEdge.targetId === fromNodeId ? toNodeId : beforeEdge.targetId;
    if (expectedSource === expectedTarget) {
      continue;
    }
    const afterEdge = after.edges.find(
      (edge) =>
        edge.sourceId === expectedSource &&
        edge.targetId === expectedTarget &&
        edge.relationType === beforeEdge.relationType,
    );
    if (afterEdge && afterEdge.id !== beforeEdge.id) {
      migrations.push({
        edgeId: afterEdge.id,
        fromNodeId,
        toNodeId,
      });
    }
  }
  return migrations;
}

function edgeMigrationFromProposal(
  proposal: GraphMutationProposal,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): EdgeMigrationRecord[] {
  switch (proposal.kind) {
    case "merge": {
      const payload = readMergePayload(proposal.payload);
      return computeEdgeMigrations(
        before,
        after,
        payload.sourceNodeId,
        payload.targetNodeId,
      );
    }
    case "archive": {
      const payload = readArchivePayload(proposal.payload);
      if (!payload.migrateEdgesToNodeId) {
        return [];
      }
      return computeEdgeMigrations(
        before,
        after,
        payload.nodeId,
        payload.migrateEdgesToNodeId,
      );
    }
    default:
      return [];
  }
}

export function buildGraphHistoryEntry(
  proposal: AutoCurateProposal | GraphMutationProposal,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
  at: string = new Date().toISOString(),
): GraphHistoryEntry {
  const reasonCode =
    "reasonCode" in proposal ? proposal.reasonCode : ("manual" as const);
  const reasonDetail =
    "reasonDetail" in proposal ? proposal.reasonDetail : proposal.summary;
  const affectedNodeIds =
    "affectedNodeIds" in proposal && proposal.affectedNodeIds
      ? proposal.affectedNodeIds
      : [];

  const edgeMigrations = edgeMigrationFromProposal(proposal, before, after);
  const affectedEdgeIds = computeAffectedEdgeIds(before, after);

  return {
    id: proposal.id,
    at,
    kind: proposal.kind,
    summary: proposal.summary,
    before,
    after,
    reasonCode,
    reasonDetail,
    affectedNodeIds,
    affectedEdgeIds,
    edgeMigrations,
  };
}

export function formatEdgeMigrationSummary(
  entry: GraphHistoryEntry,
  targetTitle?: string,
): string {
  const count = entry.edgeMigrations?.length ?? 0;
  if (count === 0) {
    return "";
  }
  const targetNodeId = entry.edgeMigrations![0]!.toNodeId;
  const title =
    targetTitle ??
    entry.after.nodes.find((node) => node.id === targetNodeId)?.title ??
    targetNodeId;
  return `${count} 条关系已迁移到 ${title}`;
}

export function affectedEdgeEndpoints(
  entry: GraphHistoryEntry,
): Array<{ sourceId: string; targetId: string; relationType: string }> {
  const afterById = new Map(entry.after.edges.map((edge) => [edge.id, edge]));
  return (entry.affectedEdgeIds ?? [])
    .map((id) => afterById.get(id))
    .filter((edge): edge is NonNullable<typeof edge> => edge !== undefined)
    .map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationType: edge.relationType,
    }));
}
