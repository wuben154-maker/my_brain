import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";

export interface StorageProvider {
  init(): Promise<void>;
  close(): Promise<void>;
  loadGraph(): Promise<BrainGraphSnapshot>;
  /** Active + archived nodes for canvas rendering (DESIGN §8). */
  loadGraphForDisplay(): Promise<BrainGraphSnapshot>;
  saveConcept(node: ConceptNode): Promise<void>;
  saveEdge(edge: GraphEdge): Promise<void>;
  deleteEdge(edgeId: string): Promise<void>;
  loadUserProfile(): Promise<UserProfile>;
  saveUserProfile(profile: UserProfile): Promise<void>;
  listPendingProposals(): Promise<ProposalEnvelope[]>;
  saveProposal(p: ProposalEnvelope): Promise<void>;
  setProposalStatus(id: string, status: ProposalStatus): Promise<void>;
}
