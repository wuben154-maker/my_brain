import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";

export type CurationReasonCode =
  | "overlap_title"
  | "overlap_semantic"
  | "stale"
  | "ingest_link"
  | "duplicate_merge"
  | "stale_archive"
  | "edge_migrate"
  | "manual";

export interface EdgeMigrationRecord {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface GraphHistoryEntry {
  id: string;
  at: string;
  kind: GraphMutationProposal["kind"];
  summary: string;
  before: BrainGraphSnapshot;
  after: BrainGraphSnapshot;
  reasonCode: CurationReasonCode;
  reasonDetail: string;
  affectedNodeIds: string[];
  /** Edge ids added or replaced by this mutation; empty for legacy entries. */
  affectedEdgeIds?: string[];
  /** Merge/archive edge endpoint migrations; empty for legacy entries. */
  edgeMigrations?: EdgeMigrationRecord[];
  undone?: boolean;
}

/** Backfill optional D2 fields for entries loaded from storage. */
export function normalizeGraphHistoryEntry(
  entry: GraphHistoryEntry,
): GraphHistoryEntry {
  return {
    ...entry,
    affectedEdgeIds: entry.affectedEdgeIds ?? [],
    edgeMigrations: entry.edgeMigrations ?? [],
  };
}
