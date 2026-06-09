import type { CurationReasonCode } from "@/domain/graphHistory";

export interface CurationReasonMeta {
  reasonCode: CurationReasonCode;
  reasonDetail: string;
  affectedNodeIds: string[];
}

export function detailForIngestLink(
  sourceTitle: string,
  targetTitle: string,
): string {
  return `新概念 ${sourceTitle} 与已有 ${targetTitle} 编排能力相关，自动连边。`;
}

export function detailForDuplicateMerge(targetTitle: string): string {
  return `与 ${targetTitle} 含义重复，已合并并迁移关联边。`;
}

export function detailForStaleArchive(nodeTitle: string): string {
  return `${nodeTitle} 已被新概念替代，已归档隐藏。`;
}

export function detailForEdgeMigrate(count: number, targetTitle: string): string {
  return `合并后 ${count} 条关系已迁移到 ${targetTitle}。`;
}

export function metaForIngestLink(
  sourceId: string,
  targetId: string,
  sourceTitle: string,
  targetTitle: string,
): CurationReasonMeta {
  return {
    reasonCode: "ingest_link",
    reasonDetail: detailForIngestLink(sourceTitle, targetTitle),
    affectedNodeIds: [sourceId, targetId],
  };
}

export function metaForDuplicateMerge(
  sourceId: string,
  targetId: string,
  targetTitle: string,
): CurationReasonMeta {
  return {
    reasonCode: "duplicate_merge",
    reasonDetail: detailForDuplicateMerge(targetTitle),
    affectedNodeIds: [sourceId, targetId],
  };
}

export function metaForStaleArchive(
  nodeId: string,
  nodeTitle: string,
): CurationReasonMeta {
  return {
    reasonCode: "stale_archive",
    reasonDetail: detailForStaleArchive(nodeTitle),
    affectedNodeIds: [nodeId],
  };
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
