import type { GraphChangeKind } from "../graph/types.js";

export type CurationActionKind = "merge" | "link" | "archive";

export interface CurationMergeAction {
  kind: "merge";
  sourceNodeId: string;
  targetNodeId: string;
  mergedIntro: string;
  summary: string;
}

export interface CurationLinkAction {
  kind: "link";
  fromId: string;
  toId: string;
  relation: string;
  summary: string;
}

export interface CurationArchiveAction {
  kind: "archive";
  nodeId: string;
  migrateEdgesToNodeId?: string;
  summary: string;
}

export type CurationAction =
  | CurationMergeAction
  | CurationLinkAction
  | CurationArchiveAction;

export interface CurationPlan {
  actions: CurationAction[];
  source: "overlap" | "llm" | "fixture";
}

export type CurationRunStatus = "applied" | "noop" | "degraded";

export interface CurationRunResult {
  status: CurationRunStatus;
  summary: string;
  edgesAdded: number;
  actionsApplied: number;
  degradedReason?: string;
}

export function changeKindForAction(action: CurationAction): GraphChangeKind {
  switch (action.kind) {
    case "merge":
      return "auto_curate_merge";
    case "link":
      return "edge_created";
    case "archive":
      return "node_archived";
  }
}
