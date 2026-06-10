import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import { conceptNodes } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { ConversationState } from "@/conversation/types";
import { planWalkthrough } from "@/lib/graphOutline";
import { visibleGraph } from "@/lib/graphMutations";

export type ContextPackMode =
  | "idle_chat"
  | "briefing"
  | "ingest_decision"
  | "teaching"
  | "topic_single"
  | "interview";

export interface GraphContextPack {
  mode: ContextPackMode;
  nodeIds: string[];
  edgeIds: string[];
  profileDigest: string;
  graphDigest: string;
  tokenEstimate: number;
}

export const DEFAULT_PACK_BUDGETS = {
  maxNodes: 12,
  maxEdges: 24,
  maxChars: 2400,
  maxProfileChars: 400,
} as const;

export function conversationStateToPackMode(
  state: ConversationState,
): ContextPackMode {
  switch (state) {
    case "briefing":
      return "briefing";
    case "ingest_decision":
      return "ingest_decision";
    case "teaching":
      return "teaching";
    case "interview":
      return "interview";
    case "idle_chat":
    case "small_talk":
    default:
      return "idle_chat";
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 1);
}

function buildProfileDigest(profile: UserProfile, maxChars: number): string {
  const parts: string[] = [];
  if (profile.displayName) {
    parts.push(`称呼：${profile.displayName}`);
  }
  if (profile.interests.length > 0) {
    parts.push(`兴趣：${profile.interests.slice(0, 6).join("、")}`);
  }
  if (profile.knownTopics.length > 0) {
    parts.push(`熟悉：${profile.knownTopics.slice(0, 4).join("、")}`);
  }
  if (profile.unknownTopics.length > 0) {
    parts.push(`待学：${profile.unknownTopics.slice(0, 4).join("、")}`);
  }
  let body = parts.join("；");
  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars - 1)}…`;
  }
  return body;
}

function scoreNode(node: ConceptNode, queryTokens: Set<string>): number {
  const tokens = tokenize(`${node.title} ${node.intro}`);
  let overlap = 0;
  for (const token of tokens) {
    if (queryTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap * 2 + (node.salience ?? 1);
}

function scoreAndPickSeeds(
  nodes: ConceptNode[],
  query: string,
  count: number,
): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...nodes]
      .sort((a, b) => (b.salience ?? 1) - (a.salience ?? 1))
      .slice(0, count)
      .map((node) => node.id);
  }
  const queryTokens = new Set(tokenize(trimmed));
  return [...nodes]
    .map((node) => ({ id: node.id, score: scoreNode(node, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((row) => row.id);
}

function expandOneHop(
  graph: BrainGraphSnapshot,
  seedIds: string[],
  maxNodes: number,
  maxEdges: number,
): { nodeIds: string[]; edgeIds: string[] } {
  const nodeIds = [...new Set(seedIds)].slice(0, maxNodes);
  const nodeSet = new Set(nodeIds);
  const edgeIds: string[] = [];

  for (const edge of graph.edges) {
    if (edgeIds.length >= maxEdges) {
      break;
    }
    const touchesSeed =
      nodeSet.has(edge.sourceId) || nodeSet.has(edge.targetId);
    if (!touchesSeed) {
      continue;
    }
    if (!nodeSet.has(edge.sourceId) && nodeIds.length < maxNodes) {
      nodeIds.push(edge.sourceId);
      nodeSet.add(edge.sourceId);
    }
    if (!nodeSet.has(edge.targetId) && nodeIds.length < maxNodes) {
      nodeIds.push(edge.targetId);
      nodeSet.add(edge.targetId);
    }
    if (nodeSet.has(edge.sourceId) && nodeSet.has(edge.targetId)) {
      edgeIds.push(edge.id);
    }
  }

  return { nodeIds, edgeIds };
}

function buildGraphDigest(
  graph: BrainGraphSnapshot,
  nodeIds: string[],
  edgeIds: string[],
  maxChars: number,
): string {
  if (nodeIds.length === 0) {
    return "";
  }
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const lines: string[] = ["<brain_subgraph>"];
  for (const id of nodeIds) {
    const node = nodeById.get(id);
    if (!node) {
      continue;
    }
    const intro =
      node.intro.length > 120 ? `${node.intro.slice(0, 119)}…` : node.intro;
    lines.push(`- ${node.title}：${intro}`);
  }
  const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
  for (const id of edgeIds) {
    const edge = edgeById.get(id);
    if (!edge) {
      continue;
    }
    const source = nodeById.get(edge.sourceId)?.title ?? edge.sourceId;
    const target = nodeById.get(edge.targetId)?.title ?? edge.targetId;
    lines.push(`  · ${source} —${edge.relationType}→ ${target}`);
  }
  lines.push("</brain_subgraph>");
  let body = lines.join("\n");
  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars - 1)}…`;
  }
  return body;
}

function estimateTokens(text: string): number {
  return Math.max(0, Math.ceil(text.length / 4));
}

export function pickSubgraphForTurn(input: {
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  mode: ContextPackMode;
  query?: string;
  highlightNodeIds?: string[];
  budgets?: { maxNodes?: number; maxEdges?: number; maxChars?: number };
}): GraphContextPack {
  const maxNodes = input.budgets?.maxNodes ?? DEFAULT_PACK_BUDGETS.maxNodes;
  const maxEdges = input.budgets?.maxEdges ?? DEFAULT_PACK_BUDGETS.maxEdges;
  const maxChars = input.budgets?.maxChars ?? DEFAULT_PACK_BUDGETS.maxChars;
  const profileDigest = buildProfileDigest(
    input.profile,
    DEFAULT_PACK_BUDGETS.maxProfileChars,
  );

  const visible = visibleGraph(input.graph);
  if (visible.nodes.length === 0) {
    return {
      mode: input.mode,
      nodeIds: [],
      edgeIds: [],
      profileDigest,
      graphDigest: "",
      tokenEstimate: estimateTokens(profileDigest),
    };
  }

  if (input.mode === "idle_chat") {
    return {
      mode: input.mode,
      nodeIds: [],
      edgeIds: [],
      profileDigest,
      graphDigest: "",
      tokenEstimate: estimateTokens(profileDigest),
    };
  }

  let seedIds: string[] = [];
  const query = input.query?.trim() ?? "";

  if (input.mode === "teaching") {
    const walk =
      query.length > 0
        ? planWalkthrough(query, input.graph)
        : (input.highlightNodeIds ?? []);
    seedIds = [
      ...walk,
      ...(input.highlightNodeIds ?? []).filter((id) => !walk.includes(id)),
    ];
    if (seedIds.length === 0 && query) {
      seedIds = scoreAndPickSeeds(conceptNodes(visible.nodes), query, 3);
    }
  } else if (input.mode === "topic_single") {
    seedIds = scoreAndPickSeeds(conceptNodes(visible.nodes), query, 1);
  } else {
    seedIds = scoreAndPickSeeds(
      conceptNodes(visible.nodes),
      query,
      input.mode === "briefing" || input.mode === "ingest_decision" ? 4 : 3,
    );
  }

  seedIds = [...new Set(seedIds)].slice(0, maxNodes);
  const { nodeIds, edgeIds } = expandOneHop(
    input.graph,
    seedIds,
    maxNodes,
    maxEdges,
  );

  const graphDigest = buildGraphDigest(
    input.graph,
    nodeIds,
    edgeIds,
    maxChars - profileDigest.length - 32,
  );

  return {
    mode: input.mode,
    nodeIds,
    edgeIds,
    profileDigest,
    graphDigest,
    tokenEstimate: estimateTokens(`${profileDigest}\n${graphDigest}`),
  };
}

export function formatGraphContextPack(pack: GraphContextPack): string {
  if (!pack.graphDigest) {
    return pack.profileDigest ? `<profile>\n${pack.profileDigest}\n</profile>` : "";
  }
  return `<profile>\n${pack.profileDigest}\n</profile>\n${pack.graphDigest}`;
}
