import type { RelationType } from "@/domain/graph";
import type { SourceRef } from "@/domain/graph/sourceRef";

/** KP-14 — isolated AI candidate; never written to permanent graph until user confirms. */
export interface ProvisionalNode {
  id: string;
  title: string;
  intro: string;
  sourceRefs: SourceRef[];
  reason: string;
  confidence: number;
  expiresAt: string;
  suggestedRelations?: Array<{
    targetId: string;
    relationType: RelationType;
  }>;
  createdAt: string;
}

export function createProvisionalNode(
  input: Omit<ProvisionalNode, never>,
): ProvisionalNode {
  return { ...input };
}

export function isProvisionalExpired(
  node: ProvisionalNode,
  nowIso: string = new Date().toISOString(),
): boolean {
  return Date.parse(node.expiresAt) <= Date.parse(nowIso);
}
