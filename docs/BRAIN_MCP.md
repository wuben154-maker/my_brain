# Brain Read-Only MCP

Local **read-only** MCP surface for the my_brain knowledge graph. External agents (e.g. Cursor, Claude Desktop) can query what the user has already confirmed into the brain without mutating it.

## Purpose

- Expose **four read tools** over stdio JSON-RPC (KOS-F1 catalog).
- Keep the **voice ingest gate** intact: this server never creates, merges, archives, or links nodes. New concepts still require the in-app **「入 / 不要 / 讲细点」** flow (V3).
- Complement the in-app agent layer, which also stays read-only on `AgentTools`; graph writes remain in ingest + auto-curate pipelines.

## Safety

- **Read-only SQLite** (`readonly: true`) against `.data/mybrain.db` (same path as `pnpm dev`).
- **No user-supplied SQL** — tool args are validated and mapped to fixed queries in `src/mcp/brainReadonlyHandlers.ts`.
- **No profile or write tools** — profile digest and legacy write/search tool names are not registered.

## Enable

The server exits unless explicitly opted in:

```bash
# MY_BRAIN_MCP=1 is required — the script exits otherwise
MY_BRAIN_MCP=1 pnpm brain:mcp
```

Optional override for the database file:

```bash
MY_BRAIN_MCP=1 MY_BRAIN_DB_PATH=/path/to/mybrain.db pnpm brain:mcp
```

Wire the command in your MCP client config as a stdio server.

## Tools (F1 read catalog)

| Tool | Description |
|------|-------------|
| `brain_search_nodes` | Search active concept nodes by title/intro |
| `brain_get_node` | Fetch one concept node by id (whitelisted fields) |
| `brain_graph_outline` | Hierarchical outline of the active brain graph |
| `brain_node_neighborhood` | Active subgraph around a node within hop limit (1–3) |

Forbidden write tools (`brain_create_node`, `brain_merge_nodes`, `brain_undo`, `brain_ingest`, etc.) are **not** registered. Legacy names such as `brain_search`, `brain_outline`, and `brain_profile_digest` are **not** part of the current catalog.

## Implementation

- Catalog: `src/mcp/brainMcpTools.ts` (`BrainMcpToolCatalog`, `MCP_FORBIDDEN_TOOLS`)
- Handlers: `src/mcp/brainReadonlyHandlers.ts` (unit-tested, no stdio)
- Server: `scripts/brain-mcp-server.mjs` (minimal MCP, zero `@modelcontextprotocol/sdk`)
- In-app server factory: `src/mcp/brainMcpServer.ts`

## Web dev storage note

`pnpm dev` uses a Vite middleware (`vite-plugin-my-brain-storage.ts`) so the browser build can talk to local SQLite. That path is **web-dev storage only** — not Brain MCP, not production Tauri, and not an external write bypass.
