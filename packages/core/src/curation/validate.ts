import type { GraphSnapshot } from "../graph/types.js";
import type { CurationAction, CurationPlan } from "./types.js";

export interface CurationValidationIssue {
  actionIndex: number;
  message: string;
}

export interface CurationValidationResult {
  ok: boolean;
  issues: CurationValidationIssue[];
}

function findVisibleNode(snapshot: GraphSnapshot, nodeId: string) {
  return snapshot.nodes.find((node) => node.id === nodeId && !node.archived);
}

function validateAction(
  snapshot: GraphSnapshot,
  action: CurationAction,
  ingestedNodeId?: string,
): string | null {
  switch (action.kind) {
    case "merge": {
      if (action.sourceNodeId === action.targetNodeId) {
        return "merge source and target must differ";
      }
      if (!findVisibleNode(snapshot, action.sourceNodeId)) {
        return "merge source node missing or archived";
      }
      if (!findVisibleNode(snapshot, action.targetNodeId)) {
        return "merge target node missing or archived";
      }
      if (!action.mergedIntro.trim()) {
        return "merge mergedIntro must be non-empty";
      }
      return null;
    }
    case "link": {
      if (action.fromId === action.toId) {
        return "link endpoints must differ";
      }
      if (!findVisibleNode(snapshot, action.fromId)) {
        return "link source node missing or archived";
      }
      if (!findVisibleNode(snapshot, action.toId)) {
        return "link target node missing or archived";
      }
      if (!action.relation.trim()) {
        return "link relation must be non-empty";
      }
      return null;
    }
    case "archive": {
      if (ingestedNodeId && action.nodeId === ingestedNodeId) {
        return "cannot archive freshly ingested node";
      }
      if (!findVisibleNode(snapshot, action.nodeId)) {
        return "archive target missing or already archived";
      }
      if (action.migrateEdgesToNodeId) {
        if (action.migrateEdgesToNodeId === action.nodeId) {
          return "archive migrate target cannot equal archived node";
        }
        if (!findVisibleNode(snapshot, action.migrateEdgesToNodeId)) {
          return "archive migrate target missing or archived";
        }
      }
      return null;
    }
  }
}

export function validateCurationPlan(
  snapshot: GraphSnapshot,
  plan: CurationPlan,
  options: { ingestedNodeId?: string } = {},
): CurationValidationResult {
  const issues: CurationValidationIssue[] = [];

  plan.actions.forEach((action, actionIndex) => {
    const message = validateAction(snapshot, action, options.ingestedNodeId);
    if (message) {
      issues.push({ actionIndex, message });
    }
  });

  return { ok: issues.length === 0, issues };
}
