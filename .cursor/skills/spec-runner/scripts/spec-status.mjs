#!/usr/bin/env node
// spec-runner helper: scan specs/*.md and print a compact status board so the
// runner can see "what's left" without reading every spec. Advisory only —
// specs/README.md「执行顺序速记」remains the authority for ordering.
//
// Output columns: STATUS | SPEC | 上游(upstream deps) | 一句话(from README is richer; here we show the spec's own 上游/下游)
// Pure Node, cross-platform. Reads from repo root (run via `node .cursor/skills/spec-runner/scripts/spec-status.mjs`).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SPECS = "specs";

function field(text, label) {
  // Match "- **<label>：** <value>" up to a "·" separator or line end.
  const re = new RegExp(`\\*\\*${label}[:：]\\*\\*\\s*([^·\\n]+)`);
  const m = text.match(re);
  return m ? m[1].trim() : "";
}

function statusOf(text) {
  const raw = field(text, "状态");
  if (raw) return raw.split("（")[0].trim(); // drop "（…）" detail
  // Fallback: look for a standalone emoji marker near the top.
  const m = text.slice(0, 400).match(/(✅|📝|🚧|⏳)/);
  return m ? m[1] : "?";
}

if (!existsSync(SPECS)) {
  console.error(`no ${SPECS}/ directory here — run from repo root`);
  process.exit(1);
}

const files = readdirSync(SPECS)
  .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
  .sort();

const rows = files.map((f) => {
  const text = readFileSync(join(SPECS, f), "utf8");
  return {
    file: f.replace(/\.md$/, ""),
    status: statusOf(text),
    upstream: field(text, "上游") || "-",
  };
});

const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
const done = rows.filter((r) => r.status.includes("✅")).length;

console.log(`# spec status — ${done}/${rows.length} done\n`);
console.log(`${pad("STATUS", 10)} ${pad("SPEC", 34)} 上游(deps)`);
console.log("-".repeat(80));
for (const r of rows) {
  console.log(`${pad(r.status, 10)} ${pad(r.file, 34)} ${r.upstream}`);
}
console.log(
  "\n排序权威：specs/README.md「执行顺序速记」。本表只看「还剩哪些 📝」。",
);
