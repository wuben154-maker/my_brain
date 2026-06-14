import type {
  GraphChangeRecord,
  GraphEdge,
  GraphNode,
  GraphRepository,
  GraphSnapshot,
  HistoryRepository,
} from "./types.js";

function cloneSnapshot(snapshot: GraphSnapshot): GraphSnapshot {
  return {
    nodes: snapshot.nodes.map((n) => ({ ...n, sourceLinks: [...n.sourceLinks] })),
    edges: snapshot.edges.map((e) => ({ ...e })),
  };
}

export class InMemoryGraphRepository implements GraphRepository {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private seq = 0;

  getSnapshot(): GraphSnapshot {
    return cloneSnapshot({ nodes: this.nodes, edges: this.edges });
  }

  countVisibleNodes(): number {
    return this.nodes.filter((n) => !n.archived).length;
  }

  createNode(
    input: Omit<GraphNode, "id" | "createdAt" | "archived">,
  ): GraphNode {
    this.seq += 1;
    const node: GraphNode = {
      id: `node-${this.seq}`,
      concept: input.concept,
      intro: input.intro,
      sourceLinks: [...input.sourceLinks],
      archived: false,
      createdAt: new Date().toISOString(),
    };
    this.nodes.push(node);
    return node;
  }

  archiveNode(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.archived = true;
    }
  }

  addEdge(input: Omit<GraphEdge, "id">): GraphEdge {
    this.seq += 1;
    const edge: GraphEdge = {
      id: `edge-${this.seq}`,
      fromId: input.fromId,
      toId: input.toId,
      relation: input.relation,
    };
    this.edges.push(edge);
    return edge;
  }

  /** Test helper — replace entire graph state. */
  replaceSnapshot(snapshot: GraphSnapshot): void {
    this.nodes = cloneSnapshot(snapshot).nodes;
    this.edges = cloneSnapshot(snapshot).edges;
  }
}

export class InMemoryHistoryRepository implements HistoryRepository {
  private changes: GraphChangeRecord[] = [];
  private seq = 0;

  listChanges(): GraphChangeRecord[] {
    return [...this.changes];
  }

  pushChange(record: Omit<GraphChangeRecord, "id" | "undone">): GraphChangeRecord {
    this.seq += 1;
    const full: GraphChangeRecord = {
      ...record,
      id: `change-${this.seq}`,
      before: cloneSnapshot(record.before),
      after: cloneSnapshot(record.after),
      undone: false,
    };
    this.changes.push(full);
    return full;
  }

  undoLastChange(): GraphChangeRecord | null {
    for (let i = this.changes.length - 1; i >= 0; i -= 1) {
      const change = this.changes[i];
      if (change && !change.undone) {
        change.undone = true;
        return change;
      }
    }
    return null;
  }
}

export function restoreSnapshotFromChange(
  graph: InMemoryGraphRepository,
  change: GraphChangeRecord,
): void {
  graph.replaceSnapshot(change.before);
}
