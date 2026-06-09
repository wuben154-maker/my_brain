import type { ConceptNode, GraphEdge } from "@/domain/graph";
import type { SourceRef } from "@/domain/graph/sourceRef";
import {
  BrainMcpToolCatalog,
  listBrainMcpReadTools,
  MCP_FORBIDDEN_TOOLS,
  type BrainMcpReadToolName,
  type BrainMcpToolDefinition,
} from "@/mcp/brainMcpTools";
import {
  brainGetNode,
  brainNeighborhood,
  brainOutline,
  brainSearch,
  type BrainOutlineEntry,
  type BrainReadonlyDeps,
} from "@/mcp/brainReadonlyHandlers";

export type BrainMcpMode = "read_only";

export interface BrainMcpRegisterOptions {
  mode?: BrainMcpMode;
  deps: BrainReadonlyDeps;
}

/** Whitelisted node fields for external agents — no raw transcript / full article. */
export interface BrainMcpNodeView {
  id: string;
  title: string;
  intro: string;
  sourceRefs: SourceRef[];
  archived: boolean;
}

export interface BrainMcpEdgeView {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: GraphEdge["relationType"];
}

export type BrainMcpToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface BrainMcpServer {
  readonly mode: BrainMcpMode;
  readonly tools: ReadonlyMap<BrainMcpReadToolName, BrainMcpToolHandler>;
  listTools(): BrainMcpToolDefinition[];
}

export class BrainMcpForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;

  constructor(readonly toolName: string) {
    super(`Forbidden MCP tool: ${toolName}`);
    this.name = "BrainMcpForbiddenError";
  }
}

export class BrainMcpToolNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(readonly toolName: string) {
    super(`MCP tool not found: ${toolName}`);
    this.name = "BrainMcpToolNotFoundError";
  }
}

export function sanitizeMcpNode(node: ConceptNode): BrainMcpNodeView {
  return {
    id: node.id,
    title: node.title,
    intro: node.intro,
    sourceRefs: node.sourceRefs ?? [],
    archived: node.archived,
  };
}

function sanitizeMcpEdge(edge: GraphEdge): BrainMcpEdgeView {
  return {
    id: edge.id,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relationType: edge.relationType,
  };
}

function sanitizeOutline(entries: BrainOutlineEntry[]): BrainOutlineEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    depth: entry.depth,
    children: sanitizeOutline(entry.children),
  }));
}

function createReadHandler(
  name: BrainMcpReadToolName,
  deps: BrainReadonlyDeps,
): BrainMcpToolHandler {
  switch (name) {
    case "brain_search_nodes":
      return async (args) => {
        const result = await brainSearch(String(args.query ?? ""), Number(args.limit ?? 10), deps);
        return { nodes: result.nodes.map(sanitizeMcpNode) };
      };
    case "brain_get_node":
      return async (args) => {
        const node = await brainGetNode(String(args.nodeId ?? ""), deps);
        return node ? sanitizeMcpNode(node) : null;
      };
    case "brain_graph_outline":
      return async () => {
        const graph = await deps.loadGraph();
        return { outline: sanitizeOutline(brainOutline(graph)) };
      };
    case "brain_node_neighborhood":
      return async (args) => {
        const result = await brainNeighborhood(
          String(args.nodeId ?? ""),
          Number(args.hops ?? 1),
          deps,
        );
        return {
          centerId: result.centerId,
          hops: result.hops,
          nodes: result.nodes.map(sanitizeMcpNode),
          edges: result.edges.map(sanitizeMcpEdge),
        };
      };
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unhandled read tool: ${_exhaustive}`);
    }
  }
}

export function createBrainMcpServer(options: BrainMcpRegisterOptions): BrainMcpServer {
  const mode = options.mode ?? "read_only";
  if (mode !== "read_only") {
    throw new Error(`Unsupported Brain MCP mode: ${mode}`);
  }

  const tools = new Map<BrainMcpReadToolName, BrainMcpToolHandler>();
  registerBrainMcpTools({ mode, tools, deps: options.deps });
  return {
    mode,
    tools,
    listTools: () => [...BrainMcpToolCatalog],
  };
}

interface RegisterTarget {
  mode: BrainMcpMode;
  tools: Map<BrainMcpReadToolName, BrainMcpToolHandler>;
  deps: BrainReadonlyDeps;
}

/** Register only the F1 read catalog; default mode is read_only. */
export function registerBrainMcpTools(target: RegisterTarget): void {
  const mode = target.mode ?? "read_only";
  if (mode !== "read_only") {
    throw new Error(`Unsupported Brain MCP mode: ${mode}`);
  }

  for (const forbidden of MCP_FORBIDDEN_TOOLS) {
    if (target.tools.has(forbidden as BrainMcpReadToolName)) {
      throw new Error(`Cannot register forbidden MCP tool: ${forbidden}`);
    }
  }

  for (const name of listBrainMcpReadTools()) {
    target.tools.set(name, createReadHandler(name, target.deps));
  }
}

export async function invokeBrainMcpTool(
  server: BrainMcpServer,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  if ((MCP_FORBIDDEN_TOOLS as readonly string[]).includes(toolName)) {
    throw new BrainMcpForbiddenError(toolName);
  }

  const handler = server.tools.get(toolName as BrainMcpReadToolName);
  if (!handler) {
    throw new BrainMcpToolNotFoundError(toolName);
  }

  return handler(args);
}
