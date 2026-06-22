#!/usr/bin/env node
/** Generates apps/mobile/fixtures/m5-evidence.sqlite — verifier-readable SQLite entrypoint. */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "m5-evidence.sqlite");

const db = new Database(outPath);
db.exec(`
CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY NOT NULL,
  concept TEXT NOT NULL,
  intro TEXT NOT NULL,
  source_links_json TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY NOT NULL,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relation TEXT NOT NULL
);
CREATE TABLE graph_history (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE user_mode_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  profile_json TEXT NOT NULL,
  cold_start_complete INTEGER NOT NULL DEFAULT 0,
  profile_version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE learning_traces (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE world_items (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run("schema_version", "1");

const profile = {
  primaryMode: "tech_tracker",
  secondaryModes: [],
  traitIds: [],
  coldStartComplete: true,
};

db.prepare(
  "INSERT INTO user_mode_profile (id, profile_json, cold_start_complete, profile_version) VALUES (1, ?, 1, 1)",
).run(JSON.stringify(profile));

db.prepare(
  `INSERT INTO graph_nodes (id, concept, intro, source_links_json, archived, created_at)
   VALUES (?, ?, ?, ?, 0, ?)`,
).run(
  "node-tech-1",
  "Realtime API",
  "语音打断原生支持",
  JSON.stringify(["https://example.com/realtime"]),
  "2026-06-15T08:00:00Z",
);

db.prepare(
  `INSERT INTO graph_nodes (id, concept, intro, source_links_json, archived, created_at)
   VALUES (?, ?, ?, ?, 0, ?)`,
).run("node-tech-2", "OpenAI Agents", "多工具编排", "[]", "2026-06-15T09:00:00Z");

db.prepare(
  "INSERT INTO graph_edges (id, from_id, to_id, relation) VALUES (?, ?, ?, ?)",
).run("edge-tech-1", "node-tech-1", "node-tech-2", "feeds");

const emptySnapshot = JSON.stringify({ nodes: [], edges: [] });
const afterSnapshot = JSON.stringify({
  nodes: [
    {
      id: "node-tech-1",
      concept: "Realtime API",
      intro: "语音打断原生支持",
      sourceLinks: ["https://example.com/realtime"],
      archived: false,
      createdAt: "2026-06-15T08:00:00Z",
    },
  ],
  edges: [],
});

db.prepare(
  `INSERT INTO graph_history (id, kind, summary, before_json, after_json, created_at, undone)
   VALUES (?, ?, ?, ?, ?, ?, 0)`,
).run(
  "chg-tech-1",
  "node_created",
  "Realtime API 趋势入库",
  emptySnapshot,
  afterSnapshot,
  "2026-06-15T08:00:00Z",
);

db.prepare(
  "INSERT INTO learning_traces (id, payload_json, created_at) VALUES (?, ?, ?)",
).run(
  "trace-tech-1",
  JSON.stringify({ topic: "Realtime API", note: "巩固语音链路", createdAt: "2026-06-15T08:15:00Z" }),
  "2026-06-15T08:15:00Z",
);

db.prepare(
  "INSERT INTO world_items (id, payload_json, updated_at) VALUES (?, ?, ?)",
).run(
  "radar-tech-1",
  JSON.stringify({ title: "GitHub 星标增速", freshness: 0.92 }),
  "2026-06-15T08:30:00Z",
);

db.close();
writeFileSync(
  join(here, "m5-evidence.sqlite.meta.json"),
  `${JSON.stringify({ entrypoint: "apps/mobile/fixtures/m5-evidence.sqlite", schemaVersion: 1 }, null, 2)}\n`,
);

console.log(`Wrote ${outPath}`);
