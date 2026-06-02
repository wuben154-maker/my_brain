#!/usr/bin/env node
// Cursor `stop` hook: enforce the memory-engine boundary (AGENT.md §5.5 /
// .cursor/rules/memory-boundary.mdc). Cheap source scan over src/, advisory.
//
// Two boundary checks:
//  1) The memory module (src/providers/memory/**, src/lib/memory*) must NOT
//     write the graph: no applyGraphMutation / persistGraphSnapshot.
//  2) The EverMemOS vendor surface (localhost:1995 / EVERMEMOS / evermemos)
//     must ONLY appear inside src/providers/memory/ — never in business code.
//
// Design: pure Node (Windows-friendly), fail-open (any error → allow), and a
// no-op until the memory module exists (no matches = pass). Never blocks work;
// it only appends a followup_message asking the agent to fix the violation.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, sep } from "node:path";

const CODE_RE = /\.(ts|tsx|mjs|cjs|js)$/;
const SKIP_DIR = new Set(["node_modules", "dist", ".git", "vendor"]);

const GRAPH_WRITE_RE = /\b(applyGraphMutation|persistGraphSnapshot)\b/;
const VENDOR_RE = /localhost:1995|EVERMEMOS|evermemos|EverMemOS/;

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function done(payload) {
  process.stdout.write(JSON.stringify(payload ?? {}));
  process.exit(0);
}

/** Normalize to forward slashes for stable path matching across OSes. */
function norm(p) {
  return p.split(sep).join("/");
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (CODE_RE.test(name)) out.push(full);
  }
}

readStdin();

try {
  if (!existsSync("src")) done({});

  const files = [];
  walk("src", files);

  const violations = [];
  for (const file of files) {
    const rel = norm(file);
    const inMemoryModule =
      rel.includes("/providers/memory/") || /\/lib\/memory[^/]*$/.test(rel);
    const isMemoryAdapter = rel.includes("/providers/memory/");

    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    if (inMemoryModule && GRAPH_WRITE_RE.test(text)) {
      violations.push(
        `${rel}: 记忆模块禁止写图谱（applyGraphMutation/persistGraphSnapshot）——落库只走提议收件箱。`,
      );
    }
    if (!isMemoryAdapter && VENDOR_RE.test(text)) {
      violations.push(
        `${rel}: EverMemOS 端点/SDK 只能出现在 src/providers/memory/ 适配器内——业务请依赖 MemoryProvider 接口。`,
      );
    }
  }

  if (violations.length === 0) done({});

  done({
    followup_message:
      "记忆边界校验未通过（见 .cursor/rules/memory-boundary.mdc）。请修复后再结束本回合：\n- " +
      violations.join("\n- "),
  });
} catch {
  done({});
}
