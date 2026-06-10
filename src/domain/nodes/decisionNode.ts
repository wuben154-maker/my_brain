import type { SourceRef } from "@/domain/graph/sourceRef";

/** KP-11 — Decision node records project trade-offs (user-confirmed ingest only). */
export interface DecisionNode {
  nodeKind: "decision";
  id: string;
  title: string;
  /** Display summary for graph/export (typically mirrors rationale). */
  intro: string;
  rationale: string;
  alternativesConsidered: string[];
  sourceRefs: SourceRef[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isDecisionNode(node: { nodeKind?: string }): node is DecisionNode {
  return node.nodeKind === "decision";
}

export function createDecisionNode(
  input: Omit<DecisionNode, "nodeKind" | "intro"> & { intro?: string },
): DecisionNode {
  return {
    nodeKind: "decision",
    ...input,
    intro: input.intro ?? input.rationale,
  };
}
