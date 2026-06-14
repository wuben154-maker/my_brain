import type { GraphRepository, HistoryRepository } from "../graph/types.js";

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

export interface AutoCurateResult {
  summary: string;
  edgesAdded: number;
}

export function runAutoCurateAfterIngest(
  nodeId: string,
  deps: IngestDeps,
): AutoCurateResult {
  const snapshot = deps.graph.getSnapshot();
  const visible = snapshot.nodes.filter((n) => !n.archived);
  if (visible.length < 2) {
    return { summary: "已入库，本次无结构整理", edgesAdded: 0 };
  }

  const anchor = visible.find((n) => n.id !== nodeId);
  if (!anchor) {
    return { summary: "已入库，本次无结构整理", edgesAdded: 0 };
  }

  const before = deps.graph.getSnapshot();
  deps.graph.addEdge({
    fromId: nodeId,
    toId: anchor.id,
    relation: "related_to",
  });
  const after = deps.graph.getSnapshot();

  deps.history.pushChange({
    kind: "auto_curate_merge",
    summary: `自动关联「${anchor.concept}」`,
    before,
    after,
    createdAt: new Date().toISOString(),
  });

  return { summary: `自动关联「${anchor.concept}」`, edgesAdded: 1 };
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

  const autoCurate = runAutoCurateAfterIngest(node.id, deps);

  return {
    nodeId: node.id,
    autoCurateSummary: autoCurate.summary,
    changeId: ingestChange.id,
  };
}

import type { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import { restoreSnapshotFromChange } from "../graph/memoryRepository.js";

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
