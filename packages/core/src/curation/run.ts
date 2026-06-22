import type { GraphRepository, HistoryRepository } from "../graph/types.js";
import type { LlmProvider } from "../providers/types.js";
import {
  applyCurationAction,
  snapshotsEqual,
} from "./apply.js";
import { planLlmCuration } from "./llmPlan.js";
import { planOverlapCuration } from "./planner.js";
import { validateCurationPlan } from "./validate.js";
import {
  changeKindForAction,
  type CurationPlan,
  type CurationRunResult,
} from "./types.js";

export interface CurationDeps {
  graph: GraphRepository;
  history: HistoryRepository;
}

export interface RunCurationOptions {
  ingestedNodeId: string;
  llm?: LlmProvider | null;
  plan?: CurationPlan;
  includeStaleArchive?: boolean;
}

function countEdgesAdded(plan: CurationPlan): number {
  return plan.actions.filter((action) => action.kind === "link").length;
}

function buildAppliedSummary(appliedSummaries: string[]): string {
  if (appliedSummaries.length === 0) {
    return "已入库，本次无结构整理";
  }
  return appliedSummaries.join("；");
}

/** Plan -> validate -> apply with per-action history entries. */
export function runPostIngestCuration(
  deps: CurationDeps,
  options: RunCurationOptions,
): CurationRunResult {
  const snapshot = deps.graph.getSnapshot();
  const ingestedNode = snapshot.nodes.find(
    (node) => node.id === options.ingestedNodeId,
  );

  if (!ingestedNode || ingestedNode.archived) {
    return {
      status: "noop",
      summary: "已入库，本次无结构整理",
      edgesAdded: 0,
      actionsApplied: 0,
    };
  }

  const visibleCount = snapshot.nodes.filter((node) => !node.archived).length;
  if (visibleCount < 2 && !options.plan) {
    return {
      status: "noop",
      summary: "已入库，本次无结构整理",
      edgesAdded: 0,
      actionsApplied: 0,
    };
  }

  return runCurationPlan(deps, {
    ingestedNodeId: options.ingestedNodeId,
    plan:
      options.plan ??
      planOverlapCuration(snapshot, options.ingestedNodeId, {
        includeStaleArchive: options.includeStaleArchive,
      }),
  });
}

export async function runPostIngestCurationWithLlm(
  deps: CurationDeps,
  options: RunCurationOptions,
): Promise<CurationRunResult> {
  if (options.plan) {
    return runPostIngestCuration(deps, options);
  }

  if (!options.llm) {
    return runPostIngestCuration(deps, options);
  }

  const snapshot = deps.graph.getSnapshot();
  const llmPlan = await planLlmCuration(
    options.llm,
    snapshot,
    options.ingestedNodeId,
  );

  if (!llmPlan.ok) {
    return {
      status: "degraded",
      summary: "已入库，结构整理降级",
      edgesAdded: 0,
      actionsApplied: 0,
      degradedReason: llmPlan.degradedReason,
    };
  }

  if (llmPlan.plan.actions.length === 0) {
    return runPostIngestCuration(deps, {
      ...options,
      plan: planOverlapCuration(snapshot, options.ingestedNodeId, {
        includeStaleArchive: options.includeStaleArchive,
      }),
    });
  }

  return runCurationPlan(deps, {
    ingestedNodeId: options.ingestedNodeId,
    plan: llmPlan.plan,
  });
}

export function runCurationPlan(
  deps: CurationDeps,
  options: { ingestedNodeId: string; plan: CurationPlan },
): CurationRunResult {
  const initial = deps.graph.getSnapshot();
  const validation = validateCurationPlan(initial, options.plan, {
    ingestedNodeId: options.ingestedNodeId,
  });

  if (!validation.ok) {
    return {
      status: "degraded",
      summary: "已入库，结构整理校验失败",
      edgesAdded: 0,
      actionsApplied: 0,
      degradedReason: validation.issues.map((issue) => issue.message).join("; "),
    };
  }

  let working = initial;
  const appliedSummaries: string[] = [];
  let edgesAdded = 0;

  for (const action of options.plan.actions) {
    const before = working;
    const after = applyCurationAction(before, action);
    if (snapshotsEqual(before, after)) {
      continue;
    }

    deps.history.pushChange({
      kind: changeKindForAction(action),
      summary: action.summary,
      before,
      after,
      createdAt: new Date().toISOString(),
    });

    working = after;
    appliedSummaries.push(action.summary);
    if (action.kind === "link") {
      edgesAdded += 1;
    }
  }

  if (!snapshotsEqual(initial, working)) {
    deps.graph.replaceSnapshot(working);
  }

  const actionsApplied = appliedSummaries.length;
  if (actionsApplied === 0) {
    return {
      status: "noop",
      summary: "已入库，本次无结构整理",
      edgesAdded: 0,
      actionsApplied: 0,
    };
  }

  return {
    status: "applied",
    summary: buildAppliedSummary(appliedSummaries),
    edgesAdded,
    actionsApplied,
  };
}

/** Synchronous post-ingest entry for ingest boundary. */
export function runAutoCurateForIngest(
  ingestedNodeId: string,
  deps: CurationDeps,
  options: Omit<RunCurationOptions, "ingestedNodeId"> = {},
): CurationRunResult {
  return runPostIngestCuration(deps, { ...options, ingestedNodeId });
}
