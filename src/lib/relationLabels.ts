import type { RelationType } from "@/domain/graph";

const RELATION_LABELS: Record<RelationType, string> = {
  is_a: "是一种",
  depends_on: "依赖于",
  replaces: "取代",
  related: "相关",
  used_in: "用于",
  decided_for: "决策于",
};

export function relationTypeLabel(relationType: RelationType): string {
  return RELATION_LABELS[relationType];
}
