import { undoLastGraphChangeInMemory } from "../conversation/ingest.js";
import {
  runPostIngestCuration,
  type CurationDeps,
  type RunCurationOptions,
} from "../curation/run.js";
import type { CurationRunResult } from "../curation/types.js";
import type { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import type { GraphChangeKind, GraphChangeRecord, HistoryRepository } from "../graph/types.js";

export interface CompanionCurationHistoryEntry {
  id: string;
  kind: GraphChangeKind;
  reason: string;
  summary: string;
  createdAt: string;
}

export interface CompanionCurationResult extends CurationRunResult {
  historySummary: string;
  historyEntries: CompanionCurationHistoryEntry[];
}

export interface CompanionUndoResult {
  restored: boolean;
  summary: string | null;
  undoneKind: GraphChangeKind | null;
}

function mapHistoryEntry(change: GraphChangeRecord): CompanionCurationHistoryEntry {
  return {
    id: change.id,
    kind: change.kind,
    reason: change.summary,
    summary: change.summary,
    createdAt: change.createdAt,
  };
}

function buildHistorySummary(entries: CompanionCurationHistoryEntry[]): string {
  if (entries.length === 0) {
    return "无新增结构整理记录";
  }
  return entries.map((entry) => `${entry.kind}: ${entry.reason}`).join("；");
}

/** Companion track wrapper — post-ingest curation with reason/history summary. */
export function runCompanionAutoCuration(
  deps: CurationDeps,
  options: RunCurationOptions,
): CompanionCurationResult {
  const beforeCount = deps.history.listChanges().length;
  const result = runPostIngestCuration(deps, options);
  const historyEntries = deps.history.listChanges().slice(beforeCount).map(mapHistoryEntry);

  return {
    ...result,
    historyEntries,
    historySummary: buildHistorySummary(historyEntries),
  };
}

/** Undo last graph change with companion-facing summary. */
export function undoCompanionAutoCuration(
  graph: InMemoryGraphRepository,
  history: HistoryRepository,
): CompanionUndoResult {
  const pending = history.listChanges().filter((change) => !change.undone);
  const last = pending.at(-1) ?? null;
  const summary = undoLastGraphChangeInMemory(graph, history);

  return {
    restored: summary !== null,
    summary,
    undoneKind: last?.kind ?? null,
  };
}
