import type { RelationType } from "./graph";
import type { SourceRef } from "@/domain/graph/sourceRef";

export interface CreateNodePayload {
  title: string;
  intro: string;
  sourceUrl: string | null;
  sourceRefs?: SourceRef[];
  /** Optional explicit id for deterministic showcase / harness fixtures. */
  id?: string;
}
export interface AttachNodePayload {
  nodeId: string;
  introAppend: string;
  sourceUrl?: string | null;
}

export interface MergeNodesPayload {
  sourceNodeId: string;
  targetNodeId: string;
  mergedIntro: string;
}

export interface ArchiveNodePayload {
  nodeId: string;
  /** When set, incident edges migrate to this node before archive (delete=archive). */
  migrateEdgesToNodeId?: string | null;
}

export interface UpdateNodePayload {
  nodeId: string;
  title: string;
  intro: string;
  sourceUrl: string | null;
}

export interface LinkNodesPayload {
  sourceId: string;
  targetId: string;
  relationType: RelationType;
}

export function readCreatePayload(
  payload: Record<string, unknown>,
): CreateNodePayload {
  const explicitId =
    typeof payload.id === "string" && payload.id.trim().length > 0
      ? payload.id.trim()
      : undefined;
  const sourceRefs = Array.isArray(payload.sourceRefs)
    ? (payload.sourceRefs as CreateNodePayload["sourceRefs"])
    : undefined;
  return {
    title: String(payload.title ?? ""),
    intro: String(payload.intro ?? ""),
    sourceUrl:
      payload.sourceUrl === null || payload.sourceUrl === undefined
        ? null
        : String(payload.sourceUrl),
    ...(sourceRefs ? { sourceRefs } : {}),
    ...(explicitId ? { id: explicitId } : {}),
  };
}

export function readAttachPayload(
  payload: Record<string, unknown>,
): AttachNodePayload {
  return {
    nodeId: String(payload.nodeId ?? ""),
    introAppend: String(payload.introAppend ?? ""),
    sourceUrl:
      payload.sourceUrl === undefined
        ? undefined
        : payload.sourceUrl === null
          ? null
          : String(payload.sourceUrl),
  };
}

export function readMergePayload(
  payload: Record<string, unknown>,
): MergeNodesPayload {
  return {
    sourceNodeId: String(payload.sourceNodeId ?? ""),
    targetNodeId: String(payload.targetNodeId ?? ""),
    mergedIntro: String(payload.mergedIntro ?? ""),
  };
}

export function readArchivePayload(
  payload: Record<string, unknown>,
): ArchiveNodePayload {
  return {
    nodeId: String(payload.nodeId ?? ""),
    migrateEdgesToNodeId:
      payload.migrateEdgesToNodeId === null ||
      payload.migrateEdgesToNodeId === undefined
        ? undefined
        : String(payload.migrateEdgesToNodeId),
  };
}

export function readUpdatePayload(
  payload: Record<string, unknown>,
): UpdateNodePayload {
  return {
    nodeId: String(payload.nodeId ?? ""),
    title: String(payload.title ?? ""),
    intro: String(payload.intro ?? ""),
    sourceUrl:
      payload.sourceUrl === null || payload.sourceUrl === undefined
        ? null
        : String(payload.sourceUrl),
  };
}

export function readLinkPayload(
  payload: Record<string, unknown>,
): LinkNodesPayload {
  return {
    sourceId: String(payload.sourceId ?? ""),
    targetId: String(payload.targetId ?? ""),
    relationType: (payload.relationType as RelationType) ?? "related",
  };
}
