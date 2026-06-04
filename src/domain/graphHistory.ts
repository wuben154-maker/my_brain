import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";

export interface GraphHistoryEntry {
  id: string;
  at: string;
  kind: GraphMutationProposal["kind"];
  summary: string;
  before: BrainGraphSnapshot;
  after: BrainGraphSnapshot;
  undone?: boolean;
}
