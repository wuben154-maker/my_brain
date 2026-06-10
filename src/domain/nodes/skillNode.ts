import type { SourceRef } from "@/domain/graph/sourceRef";

/** KP-13 — Skill node tracks capability growth targets (user-confirmed ingest only). */
export interface SkillNode {
  nodeKind: "skill";
  id: string;
  name: string;
  title: string;
  intro: string;
  proficiency: string;
  reviewCadence: string;
  sourceRefs: SourceRef[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isSkillNode(node: { nodeKind?: string }): node is SkillNode {
  return node.nodeKind === "skill";
}

export function createSkillNode(input: Omit<SkillNode, "nodeKind">): SkillNode {
  return { nodeKind: "skill", ...input };
}
