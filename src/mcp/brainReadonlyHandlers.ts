import type { BrainGraphSnapshot, BrainNode, GraphEdge } from "@/domain/graph";
import { conceptNodes, isConceptNode } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import {
  BRAIN_MCP_READ_TOOL_NAMES,
  listBrainMcpReadTools,
  MCP_FORBIDDEN_TOOLS,
  type BrainMcpReadToolName,
} from "@/mcp/brainMcpTools";
import { buildGraphOutline, type OutlineTreeNode } from "@/lib/graphOutline";
import { visibleGraph } from "@/lib/graphMutations";

/** Read-only storage slice for MCP handlers — no write methods. */
export interface BrainReadonlyDeps {
  loadGraph(): BrainGraphSnapshot | Promise<BrainGraphSnapshot>;
  loadUserProfile(): UserProfile | Promise<UserProfile>;
}

/** F1 read catalog tool names (alias for backward-compatible imports). */
export const BRAIN_READONLY_TOOL_NAMES = BRAIN_MCP_READ_TOOL_NAMES;

/** Re-export F1 forbidden freeze list for boundary tests. */
export { MCP_FORBIDDEN_TOOLS };

/** Known write-capable tool names — must never appear in listReadonlyTools(). */
export const BRAIN_WRITE_TOOL_BLOCKLIST = [
  "brain_create",
  "brain_archive",
  "brain_merge",
  "brain_link",
  "brain_write",
  "save_concept",
  "persist_graph",
  "apply_graph_mutation",
  "save_user_profile",
  "delete_concept",
  "record_learning_trace",
  "save_learning_trace",
  "learning_trace_write",
  "create_cognitive_action",
  "confirm_cognitive_action",
  "save_cognitive_action",
  "cognitive_action_write",
  "dismiss_cognitive_action",
] as const;

export type BrainReadonlyToolName = BrainMcpReadToolName;

export interface BrainSearchResult {
  nodes: BrainNode[];
}

export interface BrainNeighborhoodResult {
  centerId: string;
  hops: number;
  nodes: BrainNode[];
  edges: GraphEdge[];
}

export interface BrainOutlineEntry {
  id: string;
  title: string;
  depth: number;
  children: BrainOutlineEntry[];
}

const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 50;
const MAX_NEIGHBORHOOD_HOPS = 3;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 1);
}

function scoreNode(node: BrainNode, queryTokens: Set<string>): number {
  const tokens = tokenize(`${node.title} ${node.intro}`);
  let overlap = 0;
  for (const token of tokens) {
    if (queryTokens.has(token)) {
      overlap += 1;
    }
  }
  if (overlap === 0) {
    return 0;
  }
  const salience = isConceptNode(node) ? (node.salience ?? 1) : 1;
  return overlap * 2 + salience;
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_SEARCH_LIMIT);
}

function clampHops(hops: number): number {
  if (!Number.isFinite(hops) || hops < 1) {
    return 1;
  }
  return Math.min(Math.floor(hops), MAX_NEIGHBORHOOD_HOPS);
}

function flattenOutline(nodes: OutlineTreeNode[]): BrainOutlineEntry[] {
  return nodes.map((entry) => ({
    id: entry.node.id,
    title: entry.node.title,
    depth: entry.depth,
    children: flattenOutline(entry.children),
  }));
}

async function resolveGraph(deps: BrainReadonlyDeps): Promise<BrainGraphSnapshot> {
  return visibleGraph(await deps.loadGraph());
}

export function listReadonlyTools(): BrainReadonlyToolName[] {
  return listBrainMcpReadTools();
}

export async function brainSearch(
  query: string,
  limit: number,
  deps: BrainReadonlyDeps,
): Promise<BrainSearchResult> {
  const graph = await resolveGraph(deps);
  const capped = clampLimit(limit);
  const trimmed = query.trim();

  if (graph.nodes.length === 0) {
    return { nodes: [] };
  }

  if (!trimmed) {
    return {
      nodes: [...graph.nodes]
        .sort((a, b) => {
          const sa = isConceptNode(a) ? (a.salience ?? 1) : 1;
          const sb = isConceptNode(b) ? (b.salience ?? 1) : 1;
          return sb - sa;
        })
        .slice(0, capped),
    };
  }

  const queryTokens = new Set(tokenize(trimmed));
  const nodes = [...graph.nodes]
    .map((node) => ({ node, score: scoreNode(node, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, capped)
    .map((row) => row.node);

  return { nodes };
}

export async function brainGetNode(
  nodeId: string,
  deps: BrainReadonlyDeps,
): Promise<BrainNode | null> {
  const id = nodeId.trim();
  if (!id) {
    return null;
  }
  const graph = await resolveGraph(deps);
  return graph.nodes.find((node) => node.id === id) ?? null;
}

export async function brainNeighborhood(
  nodeId: string,
  hops: number,
  deps: BrainReadonlyDeps,
): Promise<BrainNeighborhoodResult> {
  const centerId = nodeId.trim();
  const cappedHops = clampHops(hops);
  const graph = await resolveGraph(deps);

  if (!centerId || !graph.nodes.some((node) => node.id === centerId)) {
    return { centerId, hops: cappedHops, nodes: [], edges: [] };
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    adjacency.get(edge.targetId)?.push(edge.sourceId);
  }

  const visited = new Set<string>([centerId]);
  let frontier = [centerId];

  for (let hop = 0; hop < cappedHops; hop += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (visited.has(neighbor)) {
          continue;
        }
        visited.add(neighbor);
        next.push(neighbor);
      }
    }
    frontier = next;
  }

  const nodeIds = [...visited];
  const nodeIdSet = new Set(nodeIds);
  const edges = graph.edges.filter(
    (edge) => nodeIdSet.has(edge.sourceId) && nodeIdSet.has(edge.targetId),
  );
  const nodes = nodeIds
    .map((id) => nodeById.get(id))
    .filter((node): node is BrainNode => node !== undefined);

  return { centerId, hops: cappedHops, nodes, edges };
}

export function brainOutline(graph: BrainGraphSnapshot): BrainOutlineEntry[] {
  const active = visibleGraph(graph);
  return flattenOutline(buildGraphOutline(conceptNodes(active.nodes), active.edges));
}

/** Sanitized profile text for external agents — no secrets or internal tuning. */
export function brainProfileDigest(profile: UserProfile): string {
  const parts: string[] = [];
  if (profile.displayName) {
    parts.push(`称呼：${profile.displayName}`);
  }
  if (profile.companionName) {
    parts.push(`伴侣名：${profile.companionName}`);
  }
  parts.push(`人设：${profile.persona}`);
  if (profile.interests.length > 0) {
    parts.push(`兴趣：${profile.interests.slice(0, 8).join("、")}`);
  }
  if (profile.knownTopics.length > 0) {
    parts.push(`熟悉：${profile.knownTopics.slice(0, 6).join("、")}`);
  }
  if (profile.unknownTopics.length > 0) {
    parts.push(`待学：${profile.unknownTopics.slice(0, 6).join("、")}`);
  }
  if (profile.explanationStyle) {
    parts.push(`讲解偏好：${profile.explanationStyle}`);
  }
  if (profile.habits.length > 0) {
    parts.push(`习惯：${profile.habits.slice(0, 4).join("、")}`);
  }
  return parts.join("；");
}

export function assertReadonlyToolList(): void {
  const names = new Set(listReadonlyTools());
  for (const blocked of BRAIN_WRITE_TOOL_BLOCKLIST) {
    if (names.has(blocked as BrainReadonlyToolName)) {
      throw new Error(`Readonly tool list must not include write tool: ${blocked}`);
    }
  }
  for (const forbidden of MCP_FORBIDDEN_TOOLS) {
    if (names.has(forbidden as BrainReadonlyToolName)) {
      throw new Error(`Readonly tool list must not include forbidden MCP tool: ${forbidden}`);
    }
  }
}
