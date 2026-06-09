import type { SourceRef } from "@/domain/graph/sourceRef";

export type RelationType = "is_a" | "depends_on" | "replaces" | "related";

export interface ConceptNode {
  id: string;
  title: string;
  intro: string;
  /** Legacy single-source field; kept in sync with `sourceRefs[0]?.url`. */
  sourceUrl: string | null;
  /** Provenance refs; ingest nodes must have length >= 1; legacy/manual may be `[]`. */
  sourceRefs?: SourceRef[];
  archived: boolean;  createdAt: string;
  updatedAt: string;
  /** M2: optional salience score (defaults to 1 when absent). */
  salience?: number;
  /** M2: last user/agent touch for decay (defaults to updatedAt). */
  lastTouchedAt?: string;
  /** Visual snapshot only: 2 = central hub, 1 = sub-hub; omit for leaf nodes. */
  hubLevel?: 1 | 2;
  /** W2: ISO timestamp when the node was archived (merge or standalone archive). */
  archivedAt?: string;
  /** W2: when merged away, id of the surviving concept node. */
  supersedesNodeId?: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  /** Soft-hide for graph-history undo; omitted/false = visible. */
  archived?: boolean;
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
