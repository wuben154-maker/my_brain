export type RelationType = "is_a" | "depends_on" | "replaces" | "related";

export interface ConceptNode {
  id: string;
  title: string;
  intro: string;
  sourceUrl: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /** M2: optional salience score (defaults to 1 when absent). */
  salience?: number;
  /** M2: last user/agent touch for decay (defaults to updatedAt). */
  lastTouchedAt?: string;
  /** Visual snapshot only: 2 = central hub, 1 = sub-hub; omit for leaf nodes. */
  hubLevel?: 1 | 2;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
}

export interface BrainGraphSnapshot {
  nodes: ConceptNode[];
  edges: GraphEdge[];
}

export interface GraphMutationProposal {
  id: string;
  kind: "merge" | "archive" | "link" | "create" | "attach" | "update";
  summary: string;
  payload: Record<string, unknown>;
}
