import type {
  GraphChangeRecord,
  GraphEdge,
  GraphNode,
  GraphRepository,
  GraphSnapshot,
  HistoryRepository,
  NodeDisplayEnrichment,
} from "@my-brain/core";
import {
  BRAIN_MAP_VISIBLE_MAX,
  enrichNodeDisplay,
  selectBudgetedNodes,
} from "@my-brain/core";

export const BRAIN_MAP_HISTORY_LIMIT = 5;

export interface BrainMapNodeLayout {
  node: GraphNode;
  xPct: number;
  yPct: number;
}

export interface NodeDetailViewModel {
  node: GraphNode;
  relatedNodes: GraphNode[];
  history: GraphChangeRecord[];
  sourceCount: number;
  relationCount: number;
  recentCurateCount: number;
  displayEnrichment: NodeDisplayEnrichment;
}

export const CURATION_CHANGE_KINDS = new Set<GraphChangeRecord["kind"]>([
  "auto_curate_merge",
  "node_archived",
  "edge_created",
]);

export function getRecentCurationChanges(
  changes: readonly GraphChangeRecord[],
  limit = 5,
): GraphChangeRecord[] {
  return changes
    .filter((change) => !change.undone && CURATION_CHANGE_KINDS.has(change.kind))
    .slice(-limit)
    .reverse();
}

export function layoutMapNodes(nodes: readonly GraphNode[]): BrainMapNodeLayout[] {
  const golden = 2.399963229728653;
  return nodes.map((node, index) => {
    const angle = index * golden;
    const radius = 10 + (index % 10) * 5;
    const xPct = Math.max(8, Math.min(92, 50 + Math.cos(angle) * radius));
    const yPct = Math.max(12, Math.min(88, 42 + Math.sin(angle) * radius));
    return { node, xPct, yPct };
  });
}


export const FIXTURE_MAP_VIEWPORT = {
  screenWidth: 390,
  screenHeight: 844,
  topPx: 100,
  heightPx: 654,
} as const;

export interface FixtureMapPoint {
  xPct: number;
  yPct: number;
}

export interface FixtureMapEdge {
  id: string;
  from: FixtureMapPoint;
  to: FixtureMapPoint;
  opacity: number;
}

function fixturePointFromScreen(screenX: number, screenY: number): FixtureMapPoint {
  const { screenWidth, topPx, heightPx } = FIXTURE_MAP_VIEWPORT;
  return {
    xPct: (screenX / screenWidth) * 100,
    yPct: ((screenY - topPx) / heightPx) * 100,
  };
}

const VISUAL_FIXTURE_MAP_LAYOUT: Record<string, FixtureMapPoint> = {
  "Provider 抽象": fixturePointFromScreen(218, 134),
  "RAG 检索": fixturePointFromScreen(192, 272),
};

export const FIXTURE_DIM_MAP_STARS: readonly FixtureMapPoint[] = [
  fixturePointFromScreen(104, 165),
  fixturePointFromScreen(282, 184),
  fixturePointFromScreen(88, 286),
  fixturePointFromScreen(306, 294),
  fixturePointFromScreen(268, 359),
];

export const FIXTURE_MAP_DECORATIVE_EDGES: readonly FixtureMapEdge[] = [
  { id: "e1", from: fixturePointFromScreen(104, 172), to: fixturePointFromScreen(218, 134), opacity: 0.16 },
  { id: "e2", from: fixturePointFromScreen(218, 134), to: fixturePointFromScreen(282, 192), opacity: 0.12 },
  { id: "e3", from: fixturePointFromScreen(218, 134), to: fixturePointFromScreen(192, 272), opacity: 0.18 },
  { id: "e4", from: fixturePointFromScreen(192, 272), to: fixturePointFromScreen(88, 292), opacity: 0.12 },
  { id: "e5", from: fixturePointFromScreen(192, 272), to: fixturePointFromScreen(306, 300), opacity: 0.11 },
];

/** Static map backdrop for CK-08 ui-09 — avoids store mutation missing re-render. */
export const FIXTURE_MAP_VERTICAL_GUIDE = {
  xPct: fixturePointFromScreen(218, 150).xPct,
  topPct: fixturePointFromScreen(218, 150).yPct,
  heightPct: ((372 - 150) / FIXTURE_MAP_VIEWPORT.heightPx) * 100,
} as const;

export const CONTEXT_SHEET_BACKDROP_NODES: GraphNode[] = [
  {
    id: "ctx-backdrop-provider",
    concept: "Provider 抽象",
    intro: "",
    sourceLinks: [],
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ctx-backdrop-rag",
    concept: "RAG 检索",
    intro: "",
    sourceLinks: [],
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export const CONTEXT_SHEET_BACKDROP_EDGES: GraphEdge[] = [
  {
    id: "ctx-backdrop-edge",
    fromId: "ctx-backdrop-provider",
    toId: "ctx-backdrop-rag",
    relation: "related",
  },
];

export function fixtureStarVariantForConcept(
  concept: string,
  selectedNodeId: string | null,
  nodeId: string,
): "lit" | "dim" | "selected" | "warm" {
  if (selectedNodeId === nodeId) {
    return "selected";
  }
  if (concept === "RAG 检索") {
    return "warm";
  }
  return "lit";
}

/** Deterministic map positions for CK-08 ui-06 adb capture (matches UI/06-brain-map.svg). */
export function layoutMapNodesForVisualFixture(nodes: readonly GraphNode[]): BrainMapNodeLayout[] {
  return nodes.map((node) => {
    const fixed = VISUAL_FIXTURE_MAP_LAYOUT[node.concept];
    if (fixed) {
      return { node, xPct: fixed.xPct, yPct: fixed.yPct };
    }
    return layoutMapNodes([node])[0]!;
  });
}

export function buildMapDisplayNodes(
  snapshot: GraphSnapshot,
  includeArchived: boolean,
): GraphNode[] {
  return selectBudgetedNodes(snapshot.nodes, {
    budget: BRAIN_MAP_VISIBLE_MAX,
    includeArchived,
  });
}

export function getRelatedNodes(
  nodeId: string,
  snapshot: GraphSnapshot,
  limit = 8,
): GraphNode[] {
  const relatedIds = new Set<string>();
  for (const edge of snapshot.edges) {
    if (edge.fromId === nodeId) {
      relatedIds.add(edge.toId);
    } else if (edge.toId === nodeId) {
      relatedIds.add(edge.fromId);
    }
  }

  return snapshot.nodes
    .filter((node) => relatedIds.has(node.id) && !node.archived)
    .slice(0, limit);
}

export function getNodeHistory(
  nodeId: string,
  changes: readonly GraphChangeRecord[],
  limit = BRAIN_MAP_HISTORY_LIMIT,
): GraphChangeRecord[] {
  return changes
    .filter((change) => nodeTouchesChange(nodeId, change))
    .slice(-limit)
    .reverse();
}

function nodeTouchesChange(nodeId: string, change: GraphChangeRecord): boolean {
  const ids = new Set<string>();
  for (const node of change.before.nodes) {
    ids.add(node.id);
  }
  for (const node of change.after.nodes) {
    ids.add(node.id);
  }
  return ids.has(nodeId);
}

export function countRecentCurations(
  nodeId: string,
  changes: readonly GraphChangeRecord[],
): number {
  return changes.filter(
    (change) =>
      !change.undone &&
      nodeTouchesChange(nodeId, change) &&
      CURATION_CHANGE_KINDS.has(change.kind),
  ).length;
}

export function buildNodeDetailViewModel(
  nodeId: string,
  graph: GraphRepository,
  history: HistoryRepository,
): NodeDetailViewModel | null {
  const snapshot = graph.getSnapshot();
  const node = snapshot.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return null;
  }

  const relatedNodes = getRelatedNodes(nodeId, snapshot);
  const allChanges = history.listChanges();
  const historyItems = getNodeHistory(nodeId, allChanges);

  return {
    node,
    relatedNodes,
    history: historyItems,
    sourceCount: node.sourceLinks.length,
    relationCount: relatedNodes.length,
    recentCurateCount: countRecentCurations(nodeId, allChanges),
    displayEnrichment: enrichNodeDisplay(node, allChanges),
  };
}

export function archiveNodeWithHistory(
  graph: GraphRepository,
  history: HistoryRepository,
  nodeId: string,
): GraphChangeRecord {
  const before = graph.getSnapshot();
  graph.archiveNode(nodeId);
  const after = graph.getSnapshot();
  return history.pushChange({
    kind: "node_archived",
    summary: `归档「${before.nodes.find((n) => n.id === nodeId)?.concept ?? nodeId}」— 可随时恢复`,
    before,
    after,
    createdAt: new Date().toISOString(),
  });
}

export function restoreArchivedNode(
  graph: GraphRepository & { replaceSnapshot(snapshot: GraphSnapshot): void },
  history: HistoryRepository,
  nodeId: string,
): GraphChangeRecord | null {
  const before = graph.getSnapshot();
  const target = before.nodes.find((node) => node.id === nodeId);
  if (!target?.archived) {
    return null;
  }

  const after: GraphSnapshot = {
    nodes: before.nodes.map((node) =>
      node.id === nodeId ? { ...node, archived: false } : node,
    ),
    edges: before.edges.map((edge) => ({ ...edge })),
  };
  graph.replaceSnapshot(after);

  return history.pushChange({
    kind: "node_created",
    summary: `恢复「${target.concept}」到星图 — 归档不是删除`,
    before,
    after,
    createdAt: new Date().toISOString(),
  });
}

export function visibleEdgesForNodes(
  edges: readonly GraphEdge[],
  nodeIds: ReadonlySet<string>,
): GraphEdge[] {
  return edges.filter(
    (edge) => nodeIds.has(edge.fromId) && nodeIds.has(edge.toId),
  );
}
