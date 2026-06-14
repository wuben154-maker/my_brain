/** In-memory graph node — concept + short intro only (invariant #5). */
export interface GraphNode {
  id: string;
  concept: string;
  intro: string;
  sourceLinks: string[];
  archived: boolean;
  createdAt: string;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
  relation: string;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphChangeKind =
  | "node_created"
  | "node_archived"
  | "edge_created"
  | "edge_migrated"
  | "auto_curate_merge";

export interface GraphChangeRecord {
  id: string;
  kind: GraphChangeKind;
  summary: string;
  before: GraphSnapshot;
  after: GraphSnapshot;
  createdAt: string;
  undone: boolean;
}

export interface GraphRepository {
  getSnapshot(): GraphSnapshot;
  countVisibleNodes(): number;
  createNode(input: Omit<GraphNode, "id" | "createdAt" | "archived">): GraphNode;
  archiveNode(nodeId: string): void;
  addEdge(input: Omit<GraphEdge, "id">): GraphEdge;
}

export interface HistoryRepository {
  listChanges(): GraphChangeRecord[];
  pushChange(record: Omit<GraphChangeRecord, "id" | "undone">): GraphChangeRecord;
  undoLastChange(): GraphChangeRecord | null;
}
