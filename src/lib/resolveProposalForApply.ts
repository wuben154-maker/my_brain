import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";
import { readCreatePayload, readLinkPayload } from "@/domain/graphMutationPayloads";
import type { ProposalEnvelope } from "@/agent/types";
import {
  isResearchTempId,
  resolveResearchTempIdsInProposal,
  toResearchTempId,
} from "@/agent/jobs/topicResearchJob";

export const PENDING_CREATE_PLACEHOLDER = "__PENDING_CREATE__";

const CREATE_BEFORE_LINK_MSG =
  "请先确认同批次的「新建」提议，再确认关联边。";

export class ProposalApplyOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalApplyOrderError";
  }
}

/** Same as useNewsIngestSession — map batch link target after create confirm. */
export function resolveLinkPendingCreate(
  proposal: GraphMutationProposal,
  createdNodeId: string,
): GraphMutationProposal {
  if (proposal.kind !== "link") {
    return proposal;
  }
  const payload = readLinkPayload(proposal.payload);
  if (payload.targetId !== PENDING_CREATE_PLACEHOLDER) {
    return proposal;
  }
  return {
    ...proposal,
    payload: { ...payload, targetId: createdNodeId },
  };
}

/** Map research temp ids → real node ids for nodes already in the graph. */
export function buildTempToRealFromGraph(
  graph: BrainGraphSnapshot,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of graph.nodes) {
    if (node.archived) {
      continue;
    }
    map.set(toResearchTempId(node.title), node.id);
  }
  return map;
}

export function findPendingCreateInRun(
  pending: ProposalEnvelope[],
  runId: string,
  excludeEnvelopeId: string,
): ProposalEnvelope | undefined {
  return pending.find(
    (item) =>
      item.runId === runId &&
      item.id !== excludeEnvelopeId &&
      item.proposal.kind === "create",
  );
}

function findPendingCreateForTempId(
  pending: ProposalEnvelope[],
  runId: string,
  tempId: string,
  excludeEnvelopeId: string,
): ProposalEnvelope | undefined {
  return pending.find((item) => {
    if (item.runId !== runId || item.id === excludeEnvelopeId) {
      return false;
    }
    if (item.proposal.kind !== "create") {
      return false;
    }
    const title = readCreatePayload(item.proposal.payload).title;
    return toResearchTempId(title) === tempId;
  });
}

function resolvePendingCreateTargetId(
  graph: BrainGraphSnapshot,
  proposal: GraphMutationProposal,
): string | null {
  if (proposal.kind !== "link") {
    return null;
  }
  const payload = readLinkPayload(proposal.payload);
  if (payload.targetId !== PENDING_CREATE_PLACEHOLDER) {
    return null;
  }

  const candidates = graph.nodes.filter(
    (node) => !node.archived && node.id !== payload.sourceId,
  );
  if (candidates.length === 1) {
    return candidates[0]!.id;
  }
  return null;
}

function assertResolvableTempEndpoint(
  endpointId: string,
  pending: ProposalEnvelope[],
  runId: string,
  envelopeId: string,
): void {
  if (endpointId === PENDING_CREATE_PLACEHOLDER) {
    throw new ProposalApplyOrderError(CREATE_BEFORE_LINK_MSG);
  }
  if (!isResearchTempId(endpointId)) {
    return;
  }
  if (findPendingCreateForTempId(pending, runId, endpointId, envelopeId)) {
    throw new ProposalApplyOrderError(CREATE_BEFORE_LINK_MSG);
  }
  throw new ProposalApplyOrderError(
    "关联边的目标概念尚未入库，请先确认「新建」提议。",
  );
}

export interface ResolveProposalForApplyContext {
  graph: BrainGraphSnapshot;
  pending: ProposalEnvelope[];
  runId: string;
  envelopeId: string;
}

/** Resolve __PENDING_CREATE__ / __research_temp:* before inbox approve applies. */
export function resolveProposalForApply(
  proposal: GraphMutationProposal,
  ctx: ResolveProposalForApplyContext,
): GraphMutationProposal {
  const tempToReal = buildTempToRealFromGraph(ctx.graph);
  let resolved = resolveResearchTempIdsInProposal(proposal, tempToReal);

  if (resolved.kind === "link") {
    let payload = readLinkPayload(resolved.payload);

    if (payload.targetId === PENDING_CREATE_PLACEHOLDER) {
      if (findPendingCreateInRun(ctx.pending, ctx.runId, ctx.envelopeId)) {
        throw new ProposalApplyOrderError(CREATE_BEFORE_LINK_MSG);
      }
      const targetId = resolvePendingCreateTargetId(ctx.graph, resolved);
      if (!targetId) {
        throw new ProposalApplyOrderError(
          "关联边的新建目标尚未入库，请先确认「新建」提议。",
        );
      }
      resolved = resolveLinkPendingCreate(resolved, targetId);
      payload = readLinkPayload(resolved.payload);
    }

    if (isResearchTempId(payload.sourceId) && !tempToReal.has(payload.sourceId)) {
      assertResolvableTempEndpoint(
        payload.sourceId,
        ctx.pending,
        ctx.runId,
        ctx.envelopeId,
      );
    }
    if (isResearchTempId(payload.targetId) && !tempToReal.has(payload.targetId)) {
      assertResolvableTempEndpoint(
        payload.targetId,
        ctx.pending,
        ctx.runId,
        ctx.envelopeId,
      );
    }
  }

  if (resolved.kind === "merge") {
    const sourceNodeId = String(resolved.payload.sourceNodeId ?? "");
    const targetNodeId = String(resolved.payload.targetNodeId ?? "");
    for (const id of [sourceNodeId, targetNodeId]) {
      if (isResearchTempId(id) && !tempToReal.has(id)) {
        assertResolvableTempEndpoint(id, ctx.pending, ctx.runId, ctx.envelopeId);
      }
    }
  }

  return resolved;
}
