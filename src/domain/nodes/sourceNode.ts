import type { SourceRef, SourceRefKind } from "@/domain/graph/sourceRef";
import { normalizeSourceRefUrl } from "@/domain/graph/sourceRef";

/** KP-10 — canonical Source graph node (provenance object, not a concept). */
export interface SourceNode {
  nodeKind: "source";
  id: string;
  title: string;
  intro: string;
  url: string | null;
  kind: SourceRefKind;
  worldItemId?: string;
  ingestedAt: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isSourceNode(node: { nodeKind?: string }): node is SourceNode {
  return node.nodeKind === "source";
}

export function createSourceNode(
  input: Omit<SourceNode, "nodeKind">,
): SourceNode {
  return { nodeKind: "source", ...input };
}

export function sourceNodeToSourceRef(node: SourceNode): SourceRef {
  return {
    url: node.url,
    title: node.title,
    kind: node.kind,
    ...(node.worldItemId ? { worldItemId: node.worldItemId } : {}),
    ingestedAt: node.ingestedAt,
    sourceNodeId: node.id,
  };
}

export function createSourceNodeFromSourceRef(
  ref: SourceRef,
  options: {
    id: string;
    intro?: string;
    archived?: boolean;
    createdAt: string;
    updatedAt: string;
  },
): SourceNode {
  return createSourceNode({
    id: options.id,
    title: ref.title,
    intro: options.intro ?? "",
    url: normalizeSourceRefUrl(ref.url),
    kind: ref.kind,
    ...(ref.worldItemId ? { worldItemId: ref.worldItemId } : {}),
    ingestedAt: ref.ingestedAt,
    archived: options.archived ?? false,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  });
}
