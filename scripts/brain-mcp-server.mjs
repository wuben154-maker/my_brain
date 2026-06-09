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

const { createBrainMcpServer, invokeBrainMcpTool } = await import(
  "../src/mcp/brainMcpServer.ts"
);
const { BrainMcpToolCatalog } = await import("../src/mcp/brainMcpTools.ts");
const { loadGraphFromBrainDb } = await import("../src/mcp/brainMcpDbLoader.ts");

function defaultWebDbPath() {
  return join(process.cwd(), ".data", "mybrain.db");
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
      loadGraph: () => loadGraphFromBrainDb(db),
      loadUserProfile: () => loadUserProfileFromDb(db),
    },
    close: () => db.close(),
  };
}

const TOOL_SCHEMAS = {
  brain_search_nodes: {
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
  brain_node_neighborhood: {
    type: "object",
    properties: {
      nodeId: { type: "string", description: "Center concept node id" },
      hops: { type: "number", description: "Graph hops (1-3)" },
    },
    required: ["nodeId"],
  },
  brain_graph_outline: {
    type: "object",
    properties: {},
  },
};

function toolDefinitions() {
  return BrainMcpToolCatalog.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: TOOL_SCHEMAS[tool.name],
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

function errorResult(message, code = "INTERNAL") {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message, code }) }],
    isError: true,
  };
}

async function dispatchTool(name, args, server) {
  try {
    const payload = await invokeBrainMcpTool(server, name, args ?? {});
    return textResult(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error?.code ?? "INTERNAL";
    return errorResult(message, code);
  }
}

async function handleRequest(request, server) {
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
    const result = await dispatchTool(name, args, server);
    send({ jsonrpc: "2.0", id, result });
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
  const server = createBrainMcpServer({ mode: "read_only", deps });

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
    void handleRequest(request, server);
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
