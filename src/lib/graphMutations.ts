import type {
  BrainGraphSnapshot,
  BrainNode,
  ConceptNode,
  GraphEdge,
  GraphMutationProposal,
} from "@/domain/graph";
import { isConceptNode, isDecisionNode, isProjectNode, isQuestionNode, isSkillNode, isSourceNode } from "@/domain/graph";
import type { ProjectNode } from "@/domain/nodes/projectNode";
import type { SourceNode } from "@/domain/nodes/sourceNode";
import {
  migrateLegacySourceUrlToSourceRefs,
  normalizeConceptProvenance,
  sourceRefFromLegacySourceUrl,
  sourceRefsEqual,
  syncLegacySourceUrl,
} from "@/domain/graph/sourceRef";
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

/**
 * KP-07 must-co-transact audit:
 * - `persistGraphSnapshot` alone: ingest create, proposal approve, manual graph ops.
 * - Graph + history together: use `coTransactGraphAndHistory` from `@/storage/transaction`
 *   (auto-curate). Undo: `coTransactGraphUndo` in graphHistoryStore.
 * See `MUST_CO_TRANSACT_MUTATION_PATHS` in transaction.ts.
 */

let graphMutationClock: (() => string) | null = null;

/** Test hook — freeze `updatedAt` / ingest timestamps in graph mutations. */
export function setGraphMutationClockForTests(
  clock: (() => string) | null,
): void {
  graphMutationClock = clock;
}
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
      (edge) =>
        !edge.archived &&
        activeIds.has(edge.sourceId) &&
        activeIds.has(edge.targetId),
    ),
  };
}

function nowIso(): string {
  return graphMutationClock?.() ?? new Date().toISOString();
}

function resolveCreateSourceRefs(
  payload: ReturnType<typeof readCreatePayload>,
  timestamp: string,
): ConceptNode["sourceRefs"] {
  if (payload.sourceRefs && payload.sourceRefs.length > 0) {
    return payload.sourceRefs;
  }
  const legacy = sourceRefFromLegacySourceUrl({
    title: payload.title,
    sourceUrl: payload.sourceUrl,
    updatedAt: timestamp,
    createdAt: timestamp,
  });
  return legacy ? [legacy] : [];
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

function findConceptNode(
  snapshot: BrainGraphSnapshot,
  id: string,
): ConceptNode | undefined {
  const node = snapshot.nodes.find((item) => item.id === id);
  if (!node || !isConceptNode(node)) {
    return undefined;
  }
  return node;
}

function conceptNodeChanged(prev: ConceptNode, next: ConceptNode): boolean {
  return (
    prev.title !== next.title ||
    prev.intro !== next.intro ||
    prev.sourceUrl !== next.sourceUrl ||
    !sourceRefsEqual(prev.sourceRefs ?? [], next.sourceRefs ?? []) ||
    prev.archived !== next.archived ||
    prev.archivedAt !== next.archivedAt ||
    prev.supersedesNodeId !== next.supersedesNodeId ||
    prev.updatedAt !== next.updatedAt ||
    prev.salience !== next.salience ||
    prev.lastTouchedAt !== next.lastTouchedAt
  );
}

function projectNodeChanged(prev: ProjectNode, next: ProjectNode): boolean {
  return (
    prev.title !== next.title ||
    prev.intro !== next.intro ||
    !sourceRefsEqual(prev.sourceRefs ?? [], next.sourceRefs ?? []) ||
    prev.archived !== next.archived ||
    prev.updatedAt !== next.updatedAt
  );
}

function sourceNodeChanged(prev: SourceNode, next: SourceNode): boolean {
  return (
    prev.title !== next.title ||
    prev.intro !== next.intro ||
    prev.url !== next.url ||
    prev.kind !== next.kind ||
    prev.worldItemId !== next.worldItemId ||
    prev.ingestedAt !== next.ingestedAt ||
    prev.archived !== next.archived ||
    prev.updatedAt !== next.updatedAt
  );
}

function brainNodeChanged(prev: BrainNode, next: BrainNode): boolean {
  if (isProjectNode(prev) && isProjectNode(next)) {
    return projectNodeChanged(prev, next);
  }
  if (isSourceNode(prev) && isSourceNode(next)) {
    return sourceNodeChanged(prev, next);
  }
  if (isConceptNode(prev) && isConceptNode(next)) {
    return conceptNodeChanged(prev, next);
  }
  return true;
}

async function deleteBrainNode(
  storage: StorageProvider,
  node: BrainNode,
): Promise<void> {
  if (isProjectNode(node)) {
    await storage.deleteProject(node.id);
    return;
  }
  if (isSourceNode(node)) {
    await storage.deleteSource(node.id);
    return;
  }
  if (isDecisionNode(node)) {
    await storage.deleteDecision(node.id);
    return;
  }
  if (isQuestionNode(node)) {
    await storage.deleteQuestion(node.id);
    return;
  }
  if (isSkillNode(node)) {
    await storage.deleteSkill(node.id);
    return;
  }
  await storage.deleteConcept(node.id);
}

async function saveBrainNode(
  storage: StorageProvider,
  node: BrainNode,
): Promise<void> {
  if (isProjectNode(node)) {
    await storage.saveProject(node);
    return;
  }
  if (isSourceNode(node)) {
    await storage.saveSource(node);
    return;
  }
  if (isDecisionNode(node)) {
    await storage.saveDecision(node);
    return;
  }
  if (isQuestionNode(node)) {
    await storage.saveQuestion(node);
    return;
  }
  if (isSkillNode(node)) {
    await storage.saveSkill(node);
    return;
  }
  await storage.saveConcept(node);
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
      {
        const sourceRefs = resolveCreateSourceRefs(payload, timestamp);
        nodes.push(
          normalizeConceptProvenance({
            id: payload.id?.trim() || newConceptId(payload.title),
            title: payload.title.trim(),
            intro: payload.intro.trim(),
            sourceUrl: syncLegacySourceUrl(sourceRefs ?? [], payload.sourceUrl),
            sourceRefs: sourceRefs ?? [],
            archived: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            salience: DEFAULT_SALIENCE,
            lastTouchedAt: timestamp,
          }),
        );
      }      break;
    }
    case "attach": {
      const payload = readAttachPayload(proposal.payload);
      const node = findConceptNode({ nodes, edges }, payload.nodeId);
      if (!node) {
        throw new Error("attach 目标节点不存在");
      }
      node.intro = `${node.intro}\n\n${payload.introAppend}`.trim();
      if (payload.sourceUrl !== undefined) {
        node.sourceUrl = payload.sourceUrl;
        const legacy = sourceRefFromLegacySourceUrl({
          title: node.title,
          sourceUrl: payload.sourceUrl,
          updatedAt: timestamp,
          createdAt: node.createdAt,
        });
        if (legacy && (node.sourceRefs?.length ?? 0) === 0) {
          node.sourceRefs = [legacy];
        }
      }
      node.updatedAt = timestamp;      touchNode(node, timestamp);
      break;
    }
    case "merge": {
      const payload = readMergePayload(proposal.payload);
      const source = findConceptNode({ nodes, edges }, payload.sourceNodeId);
      const target = findConceptNode({ nodes, edges }, payload.targetNodeId);
      if (!source || !target) {
        throw new Error("merge 节点不存在");
      }
      source.archived = true;
      source.archivedAt = timestamp;
      source.supersedesNodeId = target.id;
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
      const node = findConceptNode({ nodes, edges }, payload.nodeId);
      if (!node) {
        throw new Error("archive 目标节点不存在");
      }
      if (payload.migrateEdgesToNodeId) {
        const target = findConceptNode({ nodes, edges }, payload.migrateEdgesToNodeId);
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
      node.archivedAt = timestamp;
      node.updatedAt = timestamp;
      break;
    }
    case "update": {
      const payload = readUpdatePayload(proposal.payload);
      const node = findConceptNode({ nodes, edges }, payload.nodeId);
      if (!node) {
        throw new Error("update 目标节点不存在");
      }
      if (!payload.title.trim()) {
        throw new Error("概念标题不能为空");
      }
      node.title = payload.title.trim();
      node.intro = payload.intro.trim();
      node.sourceUrl = payload.sourceUrl;
      node.sourceRefs = migrateLegacySourceUrlToSourceRefs({
        ...node,
        sourceUrl: payload.sourceUrl,
      });
      node.updatedAt = timestamp;
      touchNode(node, timestamp);
      break;
    }
    case "link": {      const payload = readLinkPayload(proposal.payload);
      const source = findConceptNode({ nodes, edges }, payload.sourceId);
      const target = findConceptNode({ nodes, edges }, payload.targetId);
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
  const afterNodeIds = new Set(after.nodes.map((node) => node.id));
  const beforeEdgeIds = new Set(before.edges.map((edge) => edge.id));
  const afterEdgeIds = new Set(after.edges.map((edge) => edge.id));

  for (const edgeId of beforeEdgeIds) {
    if (!afterEdgeIds.has(edgeId)) {
      await storage.deleteEdge(edgeId);
    }
  }

  for (const node of before.nodes) {
    if (!afterNodeIds.has(node.id)) {
      await deleteBrainNode(storage, node);
    }
  }

  for (const node of after.nodes) {
    const prev = beforeNodes.get(node.id);
    if (!prev || brainNodeChanged(prev, node)) {
      await saveBrainNode(storage, node);
    }
  }
  for (const node of before.nodes) {
    const next = after.nodes.find((item) => item.id === node.id);
    if (next && next.archived && !node.archived) {
      await saveBrainNode(storage, next);
    }
  }

  for (const edge of after.edges) {
    await storage.saveEdge(edge);
  }
}

/** Persist graph-history undo without hard-deleting concepts created after the entry. */
export async function persistGraphHistoryUndoSnapshot(
  storage: StorageProvider,
  current: BrainGraphSnapshot,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): Promise<void> {
  const beforeEdgeIds = new Set(before.edges.map((edge) => edge.id));
  const afterOnlyEdgeIds = new Set(
    after.edges
      .filter((edge) => !beforeEdgeIds.has(edge.id))
      .map((edge) => edge.id),
  );

  const targetEdgesById = new Map<string, GraphEdge>();
  for (const edge of current.edges) {
    if (!afterOnlyEdgeIds.has(edge.id)) {
      targetEdgesById.set(edge.id, edge);
    }
  }
  for (const edge of before.edges) {
    targetEdgesById.set(edge.id, edge);
  }
  await storage.syncEdgesSnapshot([...targetEdgesById.values()]);

  for (const node of before.nodes) {
    const currentNode = current.nodes.find((item) => item.id === node.id);
    if (!currentNode || brainNodeChanged(currentNode, node)) {
      await saveBrainNode(storage, node);
    }
  }

}

export function primaryNodeIdFromProposal(
  proposal: GraphMutationProposal,
  after: BrainGraphSnapshot,
): string | null {
  switch (proposal.kind) {
    case "create": {
      const payload = readCreatePayload(proposal.payload);
      if (payload.id) {
        return payload.id;
      }
      const title = payload.title;
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
