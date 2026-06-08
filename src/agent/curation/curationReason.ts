import type { CurationReasonCode } from "@/domain/graphHistory";

export interface CurationReasonMeta {
  reasonCode: CurationReasonCode;
  reasonDetail: string;
  affectedNodeIds: string[];
}

export function metaForTitleOverlap(
  sourceId: string,
  targetId: string,
  sourceTitle: string,
  targetTitle: string,
): CurationReasonMeta {
  return {
    reasonCode: "overlap_title",
    reasonDetail: `标题重叠：「${sourceTitle}」与「${targetTitle}」`,
    affectedNodeIds: [sourceId, targetId],
  };
}

export function metaForStale(nodeId: string, detail: string): CurationReasonMeta {
  return {
    reasonCode: "stale",
    reasonDetail: detail,
    affectedNodeIds: [nodeId],
  };
}

export function metaForSemantic(
  sourceId: string,
  targetId: string,
  detail: string,
): CurationReasonMeta {
  return {
    reasonCode: "overlap_semantic",
    reasonDetail: detail,
    affectedNodeIds: [sourceId, targetId],
  };
}
