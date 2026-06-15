#!/usr/bin/env node
/**
 * Repository secret scan for M3-GATE — grep-based, no external deps.
 * Flags likely *values*, not identifier names in docs/tests.
 * Writes log to specs/mobile-app/reports/artifacts/M3-scan-secrets.log
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "specs/mobile-app/reports/artifacts");
const outFile = join(outDir, "M3-scan-secrets.log");

/** High-confidence secret *value* patterns (not field names). */
const valuePatterns = [
  { id: "openai-sk", regex: "sk-proj-[A-Za-z0-9]{20,}" },
  { id: "openai-sk-live", regex: "sk-live-[A-Za-z0-9]{20,}" },
  { id: "volc-key-literal", regex: 'volcAccessKey\\s*[:=]\\s*["\'][A-Za-z0-9_\\-]{16,}["\']' },
  { id: "modelscope-key-literal", regex: 'modelscopeApiKey\\s*[:=]\\s*["\'][A-Za-z0-9_\\-]{16,}["\']' },
  { id: "vite-key-assignment", regex: "VITE_(OPENAI|MODELSCOPE|VOLC|DOMESTIC_LLM)_API_KEY\\s*=\\s*[^\\s#][^\\s]{8,}" },
];

const pathExcludes = [
  "node_modules",
  ".git",
  "dist",
  "build/gha-ipa",
  "M3-scan-secrets.log",
  "M3-bundle-secret-grep.log",
  "tools/scan-secrets.mjs",
  "tools/scan-bundle-secrets.mjs",
];

mkdirSync(outDir, { recursive: true });

const lines = [
  `# M3 scan:secrets — ${new Date().toISOString()}`,
  `# mode: value-pattern scan (excludes docs/specs identifier mentions)`,
  "",
];

let hits = 0;

for (const { id, regex } of valuePatterns) {
  try {
    const excludeArgs = pathExcludes.map((e) => `":(exclude)${e}"`).join(" ");
    const cmd = `git grep -n -E "${regex}" -- . ${excludeArgs}`;
    const result = execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    if (result.trim()) {
      hits += 1;
      lines.push(`## HIT ${id}`);
      lines.push(result.trim());
      lines.push("");
    }
  } catch {
    // git grep exit 1 = no matches
  }
}

// Tracked .env files (should be gitignored; if tracked, flag)
try {
  const envHits = execSync('git ls-files ".env" ".env.local" ".env.production"', {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (envHits) {
    hits += 1;
    lines.push("## HIT tracked-env-file");
    lines.push(envHits);
    lines.push("");
  }
} catch {
  // none tracked
}

lines.push(
  hits === 0
    ? "# summary: PASS — no high-confidence secret values in tracked source"
    : `# summary: FAIL — ${hits} high-confidence hit(s)`,
);
lines.push(`# exit_code: ${hits === 0 ? 0 : 1}`);

writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(lines.join("\n"));
process.exit(hits === 0 ? 0 : 1);
