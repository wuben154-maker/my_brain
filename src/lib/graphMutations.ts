import type {
  BrainGraphSnapshot,
  ConceptNode,
  GraphEdge,
  GraphMutationProposal,
} from "@/domain/graph";
import {
  readArchivePayload,
  readAttachPayload,
  readCreatePayload,
  readLinkPayload,
  readMergePayload,
  readUpdatePayload,
} from "@/domain/graphMutationPayloads";
import {
  applySalienceEvent,
  DEFAULT_SALIENCE,
} from "@/lib/salience";
import type { StorageProvider } from "@/storage/types";

const CLUSTER_COLORS = [
  "var(--node-cyan)",
  "var(--node-blue)",
  "var(--node-violet)",
  "var(--node-amber)",
] as const;

export function nodeClusterColor(index: number): string {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

export function visibleGraph(snapshot: BrainGraphSnapshot): BrainGraphSnapshot {
  const activeIds = new Set(
    snapshot.nodes.filter((node) => !node.archived).map((node) => node.id),
  );
  return {
    nodes: snapshot.nodes.filter((node) => !node.archived),
    edges: snapshot.edges.filter(
      (edge) => activeIds.has(edge.sourceId) && activeIds.has(edge.targetId),
    ),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function newConceptId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .slice(0, 24);
  return `concept-${slug}-${Date.now()}`;
}

function newEdgeId(sourceId: string, targetId: string, relationType: string): string {
  return `edge-${sourceId}-${targetId}-${relationType}-${Date.now()}`;
}

function findNode(snapshot: BrainGraphSnapshot, id: string): ConceptNode | undefined {
  return snapshot.nodes.find((node) => node.id === id);
}

function touchNode(node: ConceptNode, timestamp: string): void {
  const touched = applySalienceEvent(node, "manual_edit", Date.parse(timestamp));
  node.salience = touched.salience;
  node.lastTouchedAt = touched.lastTouchedAt;
}

function migrateEdges(
  edges: GraphEdge[],
  fromNodeId: string,
  toNodeId: string,
): GraphEdge[] {
  const next: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    let sourceId = edge.sourceId;
    let targetId = edge.targetId;
    if (sourceId === fromNodeId) {
      sourceId = toNodeId;
    }
    if (targetId === fromNodeId) {
      targetId = toNodeId;
    }
    if (sourceId === targetId) {
      continue;
    }
    const key = `${sourceId}:${targetId}:${edge.relationType}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push({
      ...edge,
      id: newEdgeId(sourceId, targetId, edge.relationType),
      sourceId,
      targetId,
    });
  }
  return next;
}

export function applyGraphMutation(
  snapshot: BrainGraphSnapshot,
  proposal: GraphMutationProposal,
): BrainGraphSnapshot {
  const nodes = snapshot.nodes.map((node) => ({ ...node }));
  const edges = snapshot.edges.map((edge) => ({ ...edge }));
  const timestamp = nowIso();

  switch (proposal.kind) {
    case "create": {
      const payload = readCreatePayload(proposal.payload);
      if (!payload.title.trim()) {
        throw new Error("概念标题不能为空");
      }
      if (!payload.intro.trim()) {
        throw new Error("概念简介不能为空");
      }
      nodes.push({
        id: newConceptId(payload.title),
        title: payload.title.trim(),
        intro: payload.intro.trim(),
        sourceUrl: payload.sourceUrl,
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        salience: DEFAULT_SALIENCE,
        lastTouchedAt: timestamp,
      });
      break;
    }
    case "attach": {
      const payload = readAttachPayload(proposal.payload);
      const node = findNode({ nodes, edges }, payload.nodeId);
      if (!node) {
        throw new Error("attach 目标节点不存在");
      }
      node.intro = `${node.intro}\n\n${payload.introAppend}`.trim();
      if (payload.sourceUrl !== undefined) {
        node.sourceUrl = payload.sourceUrl;
      }
      node.updatedAt = timestamp;
      touchNode(node, timestamp);
      break;
    }
    case "merge": {
      const payload = readMergePayload(proposal.payload);
      const source = findNode({ nodes, edges }, payload.sourceNodeId);
      const target = findNode({ nodes, edges }, payload.targetNodeId);
      if (!source || !target) {
        throw new Error("merge 节点不存在");
      }
      source.archived = true;
      source.updatedAt = timestamp;
      target.intro = payload.mergedIntro.trim();
      target.updatedAt = timestamp;
      touchNode(target, timestamp);
      const mergedEdges = migrateEdges(
        edges,
        payload.sourceNodeId,
        payload.targetNodeId,
      );
      edges.length = 0;
      edges.push(...mergedEdges);
      break;
    }
    case "archive": {
      const payload = readArchivePayload(proposal.payload);
      const node = findNode({ nodes, edges }, payload.nodeId);
      if (!node) {
        throw new Error("archive 目标节点不存在");
      }
      if (payload.migrateEdgesToNodeId) {
        const target = findNode({ nodes, edges }, payload.migrateEdgesToNodeId);
        if (!target || target.archived) {
          throw new Error("archive 边迁移目标不存在");
        }
        if (payload.migrateEdgesToNodeId === payload.nodeId) {
          throw new Error("archive 边迁移目标不能与自身相同");
        }
        const migrated = migrateEdges(
          edges,
          payload.nodeId,
          payload.migrateEdgesToNodeId,
        );
        edges.length = 0;
        edges.push(...migrated);
      }
      node.archived = true;
      node.updatedAt = timestamp;
      break;
    }
    case "update": {
      const payload = readUpdatePayload(proposal.payload);
      const node = findNode({ nodes, edges }, payload.nodeId);
      if (!node) {
        throw new Error("update 目标节点不存在");
      }
      if (!payload.title.trim()) {
        throw new Error("概念标题不能为空");
      }
      node.title = payload.title.trim();
      node.intro = payload.intro.trim();
      node.sourceUrl = payload.sourceUrl;
      node.updatedAt = timestamp;
      touchNode(node, timestamp);
      break;
    }
    case "link": {
      const payload = readLinkPayload(proposal.payload);
      const source = findNode({ nodes, edges }, payload.sourceId);
      const target = findNode({ nodes, edges }, payload.targetId);
      if (!source || !target) {
        throw new Error("link 节点不存在");
      }
      if (payload.sourceId === payload.targetId) {
        throw new Error("link 源节点与目标节点不能相同");
      }
      edges.push({
        id: newEdgeId(payload.sourceId, payload.targetId, payload.relationType),
        sourceId: payload.sourceId,
        targetId: payload.targetId,
        relationType: payload.relationType,
      });
      break;
    }
    default:
      throw new Error(`未知图谱变更类型: ${proposal.kind}`);
  }

  return { nodes, edges };
}

export async function persistGraphSnapshot(
  storage: StorageProvider,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): Promise<void> {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  for (const node of after.nodes) {
    const prev = beforeNodes.get(node.id);
    if (
      !prev ||
      prev.title !== node.title ||
      prev.intro !== node.intro ||
      prev.sourceUrl !== node.sourceUrl ||
      prev.archived !== node.archived ||
      prev.updatedAt !== node.updatedAt ||
      prev.salience !== node.salience ||
      prev.lastTouchedAt !== node.lastTouchedAt
    ) {
      await storage.saveConcept(node);
    }
  }
  for (const node of before.nodes) {
    const next = after.nodes.find((item) => item.id === node.id);
    if (next && next.archived && !node.archived) {
      await storage.saveConcept(next);
    }
  }

  const beforeEdgeIds = new Set(before.edges.map((edge) => edge.id));
  const afterEdgeIds = new Set(after.edges.map((edge) => edge.id));
  for (const edge of after.edges) {
    await storage.saveEdge(edge);
  }
  for (const edgeId of beforeEdgeIds) {
    if (!afterEdgeIds.has(edgeId)) {
      await storage.deleteEdge(edgeId);
    }
  }
}

export function primaryNodeIdFromProposal(
  proposal: GraphMutationProposal,
  after: BrainGraphSnapshot,
): string | null {
  switch (proposal.kind) {
    case "create": {
      const title = readCreatePayload(proposal.payload).title;
      return (
        after.nodes.find((node) => node.title === title && !node.archived)?.id ??
        after.nodes[after.nodes.length - 1]?.id ??
        null
      );
    }
    case "attach":
      return readAttachPayload(proposal.payload).nodeId;
    case "merge":
      return readMergePayload(proposal.payload).targetNodeId;
    case "archive":
      return readArchivePayload(proposal.payload).nodeId;
    case "update":
      return readUpdatePayload(proposal.payload).nodeId;
    case "link":
      return readLinkPayload(proposal.payload).targetId;
    default:
      return null;
  }
}
