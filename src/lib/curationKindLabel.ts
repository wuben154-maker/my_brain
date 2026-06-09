import type { GraphMutationProposal } from "@/domain/graph";

const KIND_LABELS: Record<GraphMutationProposal["kind"], string> = {
  link: "连边",
  merge: "合并",
  archive: "归档",
  create: "新建",
  attach: "附着",
  update: "更新",
};

export function curationKindLabelZh(
  kind: GraphMutationProposal["kind"],
): string {
  return KIND_LABELS[kind] ?? kind;
}
