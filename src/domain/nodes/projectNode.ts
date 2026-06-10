import type { SourceRef } from "@/domain/graph/sourceRef";

/** KP-08 minimal Project node — expanded types (Source/Decision/…) live in KP-10+. */
export interface ProjectNode {
  nodeKind: "project";
  id: string;
  title: string;
  intro: string;
  sourceRefs: SourceRef[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isProjectNode(node: { nodeKind?: string }): node is ProjectNode {
  return node.nodeKind === "project";
}

export function createProjectNode(
  input: Omit<ProjectNode, "nodeKind">,
): ProjectNode {
  return { nodeKind: "project", ...input };
}
