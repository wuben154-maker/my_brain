#!/usr/bin/env node
/**
 * Minimal stdio MCP server for read-only brain graph access.
 * Requires MY_BRAIN_MCP=1 — see docs/BRAIN_MCP.md
 */
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "my-brain-readonly", version: "0.1.0" };

if (process.env.MY_BRAIN_MCP !== "1") {
  process.stderr.write(
    "brain-mcp-server: set MY_BRAIN_MCP=1 to start (read-only local brain access).\n",
  );
  process.exit(1);
}

const {
  brainGetNode,
  brainNeighborhood,
  brainOutline,
  brainProfileDigest,
  brainSearch,
  listReadonlyTools,
} = await import("../src/mcp/brainReadonlyHandlers.ts");

function defaultWebDbPath() {
  return join(process.cwd(), ".data", "mybrain.db");
}

function normalizeConceptRow(row) {
  return {
    ...row,
    archived: row.archived === 1,
    salience: row.salience ?? undefined,
    lastTouchedAt: row.lastTouchedAt ?? undefined,
    archivedAt: row.archivedAt ?? undefined,
    supersedesNodeId: row.supersedesNodeId ?? undefined,
  };
}

function loadGraphFromDb(db) {
  const nodes = db
    .prepare(
      `SELECT id, title, intro, source_url AS sourceUrl, archived,
              created_at AS createdAt, updated_at AS updatedAt,
              salience, last_touched_at AS lastTouchedAt,
              archived_at AS archivedAt, supersedes_node_id AS supersedesNodeId
       FROM concepts`,
    )
    .all();

  const edges = db
    .prepare(
      `SELECT id, source_id AS sourceId, target_id AS targetId,
              relation_type AS relationType
       FROM edges`,
    )
    .all();

  const conceptIds = new Set(nodes.map((node) => node.id));
  const displayEdges = edges.filter(
    (edge) => conceptIds.has(edge.sourceId) && conceptIds.has(edge.targetId),
  );

  const activeIds = new Set(
    nodes.filter((node) => node.archived !== 1).map((node) => node.id),
  );

  return {
    nodes: nodes
      .filter((node) => node.archived !== 1)
      .map((row) => normalizeConceptRow(row)),
    edges: displayEdges.filter(
      (edge) => activeIds.has(edge.sourceId) && activeIds.has(edge.targetId),
    ),
  };
}

function loadUserProfileFromDb(db) {
  const rows = db.prepare("SELECT key, value FROM user_profile").all();
  if (rows.length === 0) {
    return {
      displayName: null,
      companionName: null,
      persona: "mentor",
      interests: [],
      knownTopics: [],
      unknownTopics: [],
      explanationStyle: null,
      habits: [],
      updatedAt: new Date(0).toISOString(),
    };
  }

  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    displayName: map.displayName || null,
    companionName: map.companionName || null,
    persona: map.persona || "mentor",
    interests: JSON.parse(map.interests ?? "[]"),
    knownTopics: JSON.parse(map.knownTopics ?? "[]"),
    unknownTopics: JSON.parse(map.unknownTopics ?? "[]"),
    explanationStyle: map.explanationStyle || null,
    habits: JSON.parse(map.habits ?? "[]"),
    updatedAt: map.updatedAt ?? new Date(0).toISOString(),
  };
}

function createReadonlyDeps(dbPath) {
  if (!existsSync(dbPath)) {
    throw new Error(`Brain database not found: ${dbPath}`);
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  return {
    deps: {
      loadGraph: () => loadGraphFromDb(db),
      loadUserProfile: () => loadUserProfileFromDb(db),
    },
    close: () => db.close(),
  };
}

const TOOL_SCHEMAS = {
  brain_search: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search terms for concept title/intro" },
      limit: { type: "number", description: "Max results (default 10, max 50)" },
    },
    required: ["query"],
  },
  brain_get_node: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "Concept node id" },
    },
    required: ["nodeId"],
  },
  brain_neighborhood: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "Center concept node id" },
      hops: { type: "number", description: "Graph hops (1-3)" },
    },
    required: ["nodeId"],
  },
  brain_outline: {
    type: "object",
    properties: {},
  },
  brain_profile_digest: {
    type: "object",
    properties: {},
  },
};

function toolDefinitions() {
  const descriptions = {
    brain_search: "Search active concept nodes by title and intro",
    brain_get_node: "Fetch one active concept node by id",
    brain_neighborhood: "Active subgraph around a node within hop limit",
    brain_outline: "Hierarchical outline of the active brain graph",
    brain_profile_digest: "Sanitized user profile digest (no secrets)",
  };

  return listReadonlyTools().map((name) => ({
    name,
    description: descriptions[name],
    inputSchema: TOOL_SCHEMAS[name],
  }));
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function textResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError: false,
  };
}

function errorResult(message) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function dispatchTool(name, args, deps) {
  switch (name) {
    case "brain_search":
      return textResult(
        await brainSearch(String(args?.query ?? ""), Number(args?.limit ?? 10), deps),
      );
    case "brain_get_node":
      return textResult(await brainGetNode(String(args?.nodeId ?? ""), deps));
    case "brain_neighborhood":
      return textResult(
        await brainNeighborhood(
          String(args?.nodeId ?? ""),
          Number(args?.hops ?? 1),
          deps,
        ),
      );
    case "brain_outline":
      return textResult(brainOutline(await deps.loadGraph()));
    case "brain_profile_digest":
      return textResult({
        digest: brainProfileDigest(await deps.loadUserProfile()),
      });
    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}

async function handleRequest(request, deps) {
  const { id, method, params } = request;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    });
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: { tools: toolDefinitions() },
    });
    return;
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    try {
      const result = await dispatchTool(name, args, deps);
      send({ jsonrpc: "2.0", id, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      send({ jsonrpc: "2.0", id, result: errorResult(message) });
    }
    return;
  }

  if (id !== undefined) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }
}

async function main() {
  const dbPath = process.env.MY_BRAIN_DB_PATH ?? defaultWebDbPath();
  const { deps, close } = createReadonlyDeps(dbPath);

  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    let request;
    try {
      request = JSON.parse(trimmed);
    } catch {
      send({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      });
      return;
    }
    void handleRequest(request, deps);
  });

  rl.on("close", () => {
    close();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    close();
    process.exit(0);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`brain-mcp-server failed: ${message}\n`);
  process.exit(1);
});
