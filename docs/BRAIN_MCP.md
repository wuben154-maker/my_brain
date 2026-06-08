# Brain Read-Only MCP

Local **read-only** MCP surface for the my_brain knowledge graph and user profile. External agents (e.g. Cursor, Claude Desktop) can query what the user has already confirmed into the brain without mutating it.

## Purpose

- Expose **search**, **node lookup**, **neighborhood**, **outline**, and **profile digest** over stdio JSON-RPC.
- Keep the **voice ingest gate** intact: this server never creates, merges, archives, or links nodes. New concepts still require the in-app **「入 / 不要 / 讲细点」** flow (V3).
- Complement the in-app agent layer, which also stays read-only on `AgentTools`; graph writes remain in ingest + auto-curate pipelines.

## Safety

- **Read-only SQLite** (`readonly: true`) against `.data/mybrain.db` (same path as `pnpm dev`).
- **No user-supplied SQL** — tool args are validated and mapped to fixed queries in `src/mcp/brainReadonlyHandlers.ts`.
- **Profile digest is sanitized** — interests, persona, explanation prefs only; no API keys, env secrets, or internal `topicWeights`.

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

## Tools

| Tool | Description |
|------|-------------|
| `brain_search` | Search active nodes by title/intro |
| `brain_get_node` | Fetch one node by id |
| `brain_neighborhood` | Subgraph within N hops (max 3) |
| `brain_outline` | Tree outline of active graph |
| `brain_profile_digest` | Sanitized profile text |

Write tools (`brain_create`, `persist_graph`, etc.) are **not** registered.

## Implementation

- Handlers: `src/mcp/brainReadonlyHandlers.ts` (unit-tested, no stdio)
- Server: `scripts/brain-mcp-server.mjs` (minimal MCP, zero `@modelcontextprotocol/sdk`)
