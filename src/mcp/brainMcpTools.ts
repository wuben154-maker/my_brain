/** F1 — Brain MCP read catalog and forbidden tool freeze list. */

export type BrainMcpPermissionLevel = "read";

export interface BrainMcpToolDefinition {
  name: BrainMcpReadToolName;
  description: string;
  permissionLevel: BrainMcpPermissionLevel;
}

/** Allowed read tools (F1 spec §3.1). */
export const BRAIN_MCP_READ_TOOL_NAMES = [
  "brain_search_nodes",
  "brain_get_node",
  "brain_graph_outline",
  "brain_node_neighborhood",
] as const;

export type BrainMcpReadToolName = (typeof BRAIN_MCP_READ_TOOL_NAMES)[number];

export const BrainMcpToolCatalog: readonly BrainMcpToolDefinition[] = [
  {
    name: "brain_search_nodes",
    description: "Search active concept nodes by title and intro",
    permissionLevel: "read",
  },
  {
    name: "brain_get_node",
    description: "Fetch one concept node by id (whitelisted fields only)",
    permissionLevel: "read",
  },
  {
    name: "brain_graph_outline",
    description: "Hierarchical outline of the active brain graph",
    permissionLevel: "read",
  },
  {
    name: "brain_node_neighborhood",
    description: "Active subgraph around a node within hop limit",
    permissionLevel: "read",
  },
] as const;

/** Forbidden write tools — must never be registered (F1 spec §3.2). */
export const MCP_FORBIDDEN_TOOLS = [
  "brain_create_node",
  "brain_update_node",
  "brain_delete_node",
  "brain_merge_nodes",
  "brain_archive_node",
  "brain_undo",
  "brain_confirm_action",
  "brain_ingest",
  "brain_write_profile",
] as const;

export type BrainMcpForbiddenToolName = (typeof MCP_FORBIDDEN_TOOLS)[number];

export function listBrainMcpReadTools(): BrainMcpReadToolName[] {
  return [...BRAIN_MCP_READ_TOOL_NAMES];
}

export function assertBrainMcpCatalog(): void {
  const registered = new Set(BrainMcpToolCatalog.map((tool) => tool.name));
  for (const name of BRAIN_MCP_READ_TOOL_NAMES) {
    if (!registered.has(name)) {
      throw new Error(`Brain MCP catalog missing read tool: ${name}`);
    }
  }
  for (const forbidden of MCP_FORBIDDEN_TOOLS) {
    if (registered.has(forbidden as BrainMcpReadToolName)) {
      throw new Error(`Brain MCP catalog must not register forbidden tool: ${forbidden}`);
    }
  }
  for (const tool of BrainMcpToolCatalog) {
    if (tool.permissionLevel !== "read") {
      throw new Error(`Brain MCP read catalog tool must be read-only: ${tool.name}`);
    }
  }
}
