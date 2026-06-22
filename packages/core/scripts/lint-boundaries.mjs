#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const srcDir = join(root, "src");

const FORBIDDEN_PATTERNS = [
  { id: "react", pattern: /from\s+["']react(?:-native)?["']/ },
  { id: "zustand", pattern: /from\s+["']zustand["']/ },
  { id: "import-meta-env", pattern: /import\.meta\.env/ },
  { id: "vite-env", pattern: /\bVITE_[A-Z0-9_]+\b/ },
  { id: "bare-process-env", pattern: /process\.env(?!\s*\.)/ },
  { id: "window", pattern: /\bwindow\b/ },
  { id: "document", pattern: /\bdocument\s*[.[(]/ },
  { id: "web-audio", pattern: /AudioContext|webkitAudioContext/ },
  { id: "media-devices", pattern: /navigator\.mediaDevices/ },
  { id: "force-graph", pattern: /react-force-graph/ },
  { id: "tailwind", pattern: /from\s+["']tailwindcss/ },
];

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      entries.push(...walk(path));
      continue;
    }
    if (name.name.endsWith(".ts") || name.name.endsWith(".tsx")) {
      entries.push(path);
    }
  }
  return entries;
}

const violations = [];
for (const file of walk(srcDir)) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(root.length + 1).replaceAll("\\", "/");
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(text)) {
      violations.push(`${rel}: forbidden ${rule.id}`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write("packages/core boundary violations:\n");
  for (const line of violations) {
    process.stderr.write(`- ${line}\n`);
  }
  process.exit(1);
}

process.stdout.write("packages/core boundary check: PASS\n");
