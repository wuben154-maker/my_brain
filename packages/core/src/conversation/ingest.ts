import type { GraphRepository, HistoryRepository } from "../graph/types.js";
import type { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import { restoreSnapshotFromChange } from "../graph/memoryRepository.js";
import {
  runAutoCurateBoundary,
  type AutoCurateResult,
} from "./autoCurateBoundary.js";

export interface IngestInput {
  concept: string;
  intro: string;
  sourceLinks: string[];
}

export interface IngestDeps {
  graph: GraphRepository;
  history: HistoryRepository;
}

export interface IngestResult {
  nodeId: string;
  autoCurateSummary: string;
  changeId: string;
}

/** @deprecated Use runAutoCurateBoundary — LIVE-05 replaces the hook body. */
export function runAutoCurateAfterIngest(
  nodeId: string,
  deps: IngestDeps,
): AutoCurateResult {
  return runAutoCurateBoundary(nodeId, deps);
}

/** User-confirmed ingest — sole creator of permanent nodes in M1. */
export function applyIngestCreate(input: IngestInput, deps: IngestDeps): IngestResult {
  const before = deps.graph.getSnapshot();
  const node = deps.graph.createNode({
    concept: input.concept,
    intro: input.intro,
    sourceLinks: input.sourceLinks,
  });
  const afterIngest = deps.graph.getSnapshot();
  const ingestChange = deps.history.pushChange({
    kind: "node_created",
    summary: `入库「${node.concept}」`,
    before,
    after: afterIngest,
    createdAt: new Date().toISOString(),
  });

  const autoCurate = runAutoCurateBoundary(node.id, deps);

  return {
    nodeId: node.id,
    autoCurateSummary: autoCurate.summary,
    changeId: ingestChange.id,
  };
}

/** Undo last graph change — requires InMemoryGraphRepository for snapshot restore. */
export function undoLastGraphChangeInMemory(
  graph: InMemoryGraphRepository,
  history: HistoryRepository,
): string | null {
  const change = history.undoLastChange();
  if (!change) {
    return null;
  }
  restoreSnapshotFromChange(graph, change);
  return change.summary;
}

export {
  getAutoCurateBoundary,
  runAutoCurateBoundary,
  setAutoCurateBoundary,
} from "./autoCurateBoundary.js";
export type { AutoCurateBoundary, AutoCurateResult } from "./autoCurateBoundary.js";
