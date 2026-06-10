import type { SourceRef } from "@/domain/graph/sourceRef";
import type { DecisionNode } from "@/domain/nodes/decisionNode";
import { isDecisionNode } from "@/domain/nodes/decisionNode";
import type { ProjectNode } from "@/domain/nodes/projectNode";
import type { QuestionNode } from "@/domain/nodes/questionNode";
import { isQuestionNode } from "@/domain/nodes/questionNode";
import type { SkillNode } from "@/domain/nodes/skillNode";
import { isSkillNode } from "@/domain/nodes/skillNode";
import type { SourceNode } from "@/domain/nodes/sourceNode";
import {
  isSourceNode,
  sourceNodeToSourceRef,
} from "@/domain/nodes/sourceNode";
export type { DecisionNode } from "@/domain/nodes/decisionNode";
export { createDecisionNode, isDecisionNode } from "@/domain/nodes/decisionNode";
export type { ProjectNode } from "@/domain/nodes/projectNode";
export { createProjectNode, isProjectNode } from "@/domain/nodes/projectNode";
export type { QuestionNode, QuestionStatus } from "@/domain/nodes/questionNode";
export { createQuestionNode, isQuestionNode } from "@/domain/nodes/questionNode";
export type { SkillNode } from "@/domain/nodes/skillNode";
export { createSkillNode, isSkillNode } from "@/domain/nodes/skillNode";
export type { SourceNode } from "@/domain/nodes/sourceNode";
export {
  createSourceNode,
  createSourceNodeFromSourceRef,
  isSourceNode,
  sourceNodeToSourceRef,
} from "@/domain/nodes/sourceNode";
export type RelationType =
  | "is_a"
  | "depends_on"
  | "replaces"
  | "related"
  /** Concept or WorldItem context applies to a Project (KP-08). */
  | "used_in"
  /** Decision applies to a Project/Concept (KP-11). */
  | "decided_for";

export interface ConceptNode {
  nodeKind?: "concept";
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

export type BrainNode =
  | ConceptNode
  | ProjectNode
  | SourceNode
  | DecisionNode
  | QuestionNode
  | SkillNode;

const STRUCTURAL_NODE_KINDS = new Set([
  "project",
  "source",
  "decision",
  "question",
  "skill",
]);

export function isConceptNode(node: BrainNode): node is ConceptNode {
  return !STRUCTURAL_NODE_KINDS.has(node.nodeKind ?? "concept");
}

/** Auxiliary nodes hidden from default star map (KP-10–13 noise control). */
export function isStarMapAuxiliaryNode(node: BrainNode): boolean {
  return (
    isSourceNode(node) ||
    isDecisionNode(node) ||
    isQuestionNode(node) ||
    isSkillNode(node)
  );
}

/** Active concept nodes only — use when APIs are concept-scoped (salience, sourceUrl, ingest). */
export function conceptNodes(nodes: BrainNode[]): ConceptNode[] {
  return nodes.filter(isConceptNode);
}

/** Display intro across all node kinds (structural nodes included). */
export function nodeIntro(node: BrainNode): string {
  if (isDecisionNode(node)) {
    return node.intro || node.rationale;
  }
  if (isQuestionNode(node)) {
    return node.intro || node.context || node.prompt;
  }
  return node.intro;
}

/** Provenance refs for non-source nodes; sources derive from url/kind fields. */
export function nodeSourceRefs(node: BrainNode): SourceRef[] {
  if (isSourceNode(node)) {
    return [sourceNodeToSourceRef(node)];
  }
  if (isConceptNode(node)) {
    return node.sourceRefs ?? [];
  }
  return node.sourceRefs ?? [];
}
/** Legacy source URL for dedupe/docs; projects use first sourceRef; sources use url. */
export function nodeSourceUrl(node: BrainNode): string | null {
  if (isConceptNode(node)) {
    return node.sourceUrl;
  }
  if (isSourceNode(node)) {
    return node.url;
  }
  return nodeSourceRefs(node)[0]?.url ?? null;
}
export interface BrainGraphSnapshot {
  nodes: BrainNode[];
  edges: GraphEdge[];
}

export interface GraphMutationProposal {
  id: string;
  kind: "merge" | "archive" | "link" | "create" | "attach" | "update";
  summary: string;
  payload: Record<string, unknown>;
}
