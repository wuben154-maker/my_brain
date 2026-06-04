import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { UserProfile } from "@/domain/profile";
import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";

export interface StorageProvider {
  init(): Promise<void>;
  close(): Promise<void>;
  loadGraph(): Promise<BrainGraphSnapshot>;
  /** Active + archived nodes for canvas rendering (DESIGN §8). */
  loadGraphForDisplay(): Promise<BrainGraphSnapshot>;
  saveConcept(node: ConceptNode): Promise<void>;
  /** Hard-remove a concept and its incident edges (graph history undo only). */
  deleteConcept(conceptId: string): Promise<void>;
  saveEdge(edge: GraphEdge): Promise<void>;
  deleteEdge(edgeId: string): Promise<void>;
  loadUserProfile(): Promise<UserProfile>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  listPendingProposals(): Promise<ProposalEnvelope[]>;
  saveProposal(p: ProposalEnvelope): Promise<void>;
  setProposalStatus(id: string, status: ProposalStatus): Promise<void>;
  getAppMeta(key: string): Promise<string | null>;
  setAppMeta(key: string, value: string): Promise<void>;
  /** UTC date key `YYYY-MM-DD` — daily agent token rollup (H1). */
  loadAgentUsage(usageDate: string): Promise<number>;
  addAgentUsage(usageDate: string, tokens: number): Promise<void>;
  listGraphHistory(): Promise<GraphHistoryEntry[]>;
  saveGraphHistoryEntry(entry: GraphHistoryEntry): Promise<void>;
  setGraphHistoryUndone(id: string): Promise<void>;
}
