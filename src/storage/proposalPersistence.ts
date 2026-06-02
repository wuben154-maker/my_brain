import type {
  GraphMutationProposal,
  RelationType,
} from "../domain/graph";
import {
  readArchivePayload,
  readAttachPayload,
  readCreatePayload,
  readLinkPayload,
  readMergePayload,
  readUpdatePayload,
} from "../domain/graphMutationPayloads";
import type {
  ProposalEnvelope,
  ProposalSource,
  ProposalStatus,
} from "../agent/types";

const PROPOSAL_SOURCES = [
  "voice",
  "background_ingest",
  "research_loop",
  "profile_suggestion",
] as const satisfies readonly ProposalSource[];

const PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const satisfies readonly ProposalStatus[];

const RELATION_TYPES = [
  "is_a",
  "depends_on",
  "replaces",
  "related",
] as const satisfies readonly RelationType[];

export class InvalidProposalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidProposalError";
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) {
    throw new InvalidProposalError(`Invalid proposal: ${field} is required`);
  }
}

function isProposalSource(value: string): value is ProposalSource {
  return (PROPOSAL_SOURCES as readonly string[]).includes(value);
}

export function assertProposalStatus(status: string): asserts status is ProposalStatus {
  if (!(PROPOSAL_STATUSES as readonly string[]).includes(status)) {
    throw new InvalidProposalError(`Invalid proposal status: ${status}`);
  }
}

/** Normalize and validate mutation payload before persisting. */
export function validateGraphMutationProposal(
  proposal: GraphMutationProposal,
): Record<string, unknown> {
  assertNonEmpty(proposal.id, "proposal.id");
  assertNonEmpty(proposal.summary, "summary");

  switch (proposal.kind) {
    case "create": {
      const payload = readCreatePayload(proposal.payload);
      assertNonEmpty(payload.title, "title");
      assertNonEmpty(payload.intro, "intro");
      return {
        title: payload.title,
        intro: payload.intro,
        sourceUrl: payload.sourceUrl,
      };
    }
    case "attach": {
      const payload = readAttachPayload(proposal.payload);
      assertNonEmpty(payload.nodeId, "nodeId");
      assertNonEmpty(payload.introAppend, "introAppend");
      return payload.sourceUrl === undefined
        ? { nodeId: payload.nodeId, introAppend: payload.introAppend }
        : {
            nodeId: payload.nodeId,
            introAppend: payload.introAppend,
            sourceUrl: payload.sourceUrl,
          };
    }
    case "merge": {
      const payload = readMergePayload(proposal.payload);
      assertNonEmpty(payload.sourceNodeId, "sourceNodeId");
      assertNonEmpty(payload.targetNodeId, "targetNodeId");
      assertNonEmpty(payload.mergedIntro, "mergedIntro");
      return {
        sourceNodeId: payload.sourceNodeId,
        targetNodeId: payload.targetNodeId,
        mergedIntro: payload.mergedIntro,
      };
    }
    case "archive": {
      const payload = readArchivePayload(proposal.payload);
      assertNonEmpty(payload.nodeId, "nodeId");
      return payload.migrateEdgesToNodeId === undefined
        ? { nodeId: payload.nodeId }
        : {
            nodeId: payload.nodeId,
            migrateEdgesToNodeId: payload.migrateEdgesToNodeId,
          };
    }
    case "update": {
      const payload = readUpdatePayload(proposal.payload);
      assertNonEmpty(payload.nodeId, "nodeId");
      assertNonEmpty(payload.title, "title");
      assertNonEmpty(payload.intro, "intro");
      return {
        nodeId: payload.nodeId,
        title: payload.title,
        intro: payload.intro,
        sourceUrl: payload.sourceUrl,
      };
    }
    case "link": {
      const payload = readLinkPayload(proposal.payload);
      assertNonEmpty(payload.sourceId, "sourceId");
      assertNonEmpty(payload.targetId, "targetId");
      if (!(RELATION_TYPES as readonly string[]).includes(payload.relationType)) {
        throw new InvalidProposalError(
          `Invalid proposal: relationType "${String(payload.relationType)}"`,
        );
      }
      return {
        sourceId: payload.sourceId,
        targetId: payload.targetId,
        relationType: payload.relationType,
      };
    }
    default: {
      const _exhaustive: never = proposal.kind;
      throw new InvalidProposalError(`Unknown proposal kind: ${String(_exhaustive)}`);
    }
  }
}

export function validateProposalEnvelope(
  envelope: ProposalEnvelope,
): Record<string, unknown> {
  assertNonEmpty(envelope.id, "id");
  assertNonEmpty(envelope.runId, "runId");
  assertNonEmpty(envelope.createdAt, "createdAt");

  if (!isProposalSource(envelope.source)) {
    throw new InvalidProposalError(`Invalid proposal source: ${envelope.source}`);
  }
  assertProposalStatus(envelope.status);

  if (envelope.proposal.id !== envelope.id) {
    throw new InvalidProposalError(
      "Proposal envelope id must match proposal.id",
    );
  }

  return validateGraphMutationProposal(envelope.proposal);
}

export interface StoredProposalRow {
  id: string;
  run_id: string;
  created_at: string;
  kind: GraphMutationProposal["kind"];
  summary: string;
  payload: string;
  source: ProposalSource;
  status: ProposalStatus;
}

/** Shared by better-sqlite3 and Tauri SQL — keeps list ordering identical. */
export const LIST_PENDING_PROPOSALS_SQL = `
SELECT id, run_id, created_at, kind, summary, payload, source, status
FROM agent_proposals
WHERE status = 'pending'
ORDER BY created_at ASC`.trim();

export function proposalEnvelopeToStoredRow(
  envelope: ProposalEnvelope,
  normalizedPayload: Record<string, unknown>,
): StoredProposalRow {
  return {
    id: envelope.id,
    run_id: envelope.runId,
    created_at: envelope.createdAt,
    kind: envelope.proposal.kind,
    summary: envelope.proposal.summary,
    payload: JSON.stringify(normalizedPayload),
    source: envelope.source,
    status: envelope.status,
  };
}

/** Validate envelope + normalize payload before either adapter writes. */
export function prepareProposalUpsertRow(
  p: ProposalEnvelope,
): StoredProposalRow {
  return proposalEnvelopeToStoredRow(p, validateProposalEnvelope(p));
}

export function mapStoredProposalRows(
  rows: StoredProposalRow[],
): ProposalEnvelope[] {
  return rows.map((row) => storedRowToProposalEnvelope(row));
}

export function assertProposalStatusUpdated(
  id: string,
  changes: number,
): void {
  if (changes === 0) {
    throw new Error(`Proposal not found: ${id}`);
  }
}

export function storedRowToProposalEnvelope(
  row: StoredProposalRow,
): ProposalEnvelope {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    throw new InvalidProposalError("Invalid proposal: payload is not valid JSON");
  }

  const proposal: GraphMutationProposal = {
    id: row.id,
    kind: row.kind,
    summary: row.summary,
    payload,
  };

  validateGraphMutationProposal(proposal);

  if (!isProposalSource(row.source)) {
    throw new InvalidProposalError(`Invalid proposal source: ${row.source}`);
  }
  assertProposalStatus(row.status);

  return {
    id: row.id,
    runId: row.run_id,
    createdAt: row.created_at,
    source: row.source,
    status: row.status,
    proposal,
  };
}
