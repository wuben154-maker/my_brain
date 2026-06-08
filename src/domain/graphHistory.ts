import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";

export type CurationReasonCode =
  | "overlap_title"
  | "overlap_semantic"
  | "stale"
  | "ingest_link"
  | "manual";

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
  undone?: boolean;
}