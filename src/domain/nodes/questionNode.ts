import type { SourceRef } from "@/domain/graph/sourceRef";

export type QuestionStatus = "open" | "answered" | "archived";

/** KP-12 — Question node captures learning blind spots (user-confirmed ingest only). */
export interface QuestionNode {
  nodeKind: "question";
  id: string;
  title: string;
  intro: string;
  prompt: string;
  context: string;
  status: QuestionStatus;
  sourceRefs: SourceRef[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isQuestionNode(node: { nodeKind?: string }): node is QuestionNode {
  return node.nodeKind === "question";
}

export function createQuestionNode(
  input: Omit<QuestionNode, "nodeKind" | "intro"> & { intro?: string },
): QuestionNode {
  return {
    nodeKind: "question",
    ...input,
    intro: input.intro ?? input.context ?? input.prompt,
  };
}
