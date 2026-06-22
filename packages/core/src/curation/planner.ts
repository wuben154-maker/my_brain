import type { GraphNode, GraphSnapshot } from "../graph/types.js";
import type { CurationAction, CurationPlan } from "./types.js";

const OVERLAP_LINK_THRESHOLD = 0.5;
const OVERLAP_MERGE_THRESHOLD = 0.75;
const STALE_ARCHIVE_DAYS = 90;

function tokenizeConcept(concept: string): string[] {
  return concept
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 1);
}

function conceptOverlapRatio(a: string, b: string): number {
  const tokensA = new Set(tokenizeConcept(a));
  const tokensB = new Set(tokenizeConcept(b));
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      shared += 1;
    }
  }
  return shared / Math.min(tokensA.size, tokensB.size);
}

function bestOverlapPeer(
  nodes: GraphNode[],
  ingestedNode: GraphNode,
): { peer: GraphNode; ratio: number } | null {
  let best: { peer: GraphNode; ratio: number } | null = null;
  for (const node of nodes) {
    if (node.archived || node.id === ingestedNode.id) {
      continue;
    }
    const ratio = conceptOverlapRatio(ingestedNode.concept, node.concept);
    if (!best || ratio > best.ratio) {
      best = { peer: node, ratio };
    }
  }
  return best;
}

function staleArchiveActions(
  nodes: GraphNode[],
  ingestedNodeId: string,
  now = new Date(),
): CurationAction[] {
  const cutoff = now.getTime() - STALE_ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
  const actions: CurationAction[] = [];

  for (const node of nodes) {
    if (node.archived || node.id === ingestedNodeId) {
      continue;
    }
    const createdAt = Date.parse(node.createdAt);
    if (Number.isNaN(createdAt) || createdAt >= cutoff) {
      continue;
    }
    actions.push({
      kind: "archive",
      nodeId: node.id,
      summary: `归档过时概念「${node.concept}」`,
    });
  }

  return actions;
}

/** Rule-based planner — no LLM, no node creation. */
export function planOverlapCuration(
  snapshot: GraphSnapshot,
  ingestedNodeId: string,
  options: { includeStaleArchive?: boolean; now?: Date } = {},
): CurationPlan {
  const ingestedNode = snapshot.nodes.find((node) => node.id === ingestedNodeId);
  if (!ingestedNode || ingestedNode.archived) {
    return { actions: [], source: "overlap" };
  }

  const visible = snapshot.nodes.filter((node) => !node.archived);
  if (visible.length < 2) {
    return { actions: [], source: "overlap" };
  }

  const actions: CurationAction[] = [];
  const overlap = bestOverlapPeer(visible, ingestedNode);

  if (overlap && overlap.ratio >= OVERLAP_MERGE_THRESHOLD) {
    actions.push({
      kind: "merge",
      sourceNodeId: ingestedNode.id,
      targetNodeId: overlap.peer.id,
      mergedIntro: ingestedNode.intro || overlap.peer.intro,
      summary: `自动合并相似概念「${overlap.peer.concept}」`,
    });
  } else if (overlap && overlap.ratio >= OVERLAP_LINK_THRESHOLD) {
    actions.push({
      kind: "link",
      fromId: ingestedNode.id,
      toId: overlap.peer.id,
      relation: "related_to",
      summary: `自动关联相似概念「${overlap.peer.concept}」`,
    });
  }

  if (options.includeStaleArchive) {
    actions.push(
      ...staleArchiveActions(visible, ingestedNodeId, options.now),
    );
  }

  return { actions, source: "overlap" };
}

export function planFromFixtureActions(actions: CurationAction[]): CurationPlan {
  return { actions, source: "fixture" };
}

export function planFromLlmActions(actions: CurationAction[]): CurationPlan {
  return { actions, source: "llm" };
}
