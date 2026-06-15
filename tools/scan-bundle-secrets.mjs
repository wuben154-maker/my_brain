#!/usr/bin/env node
/**
 * Bundle artifact grep for M3-GATE — scans known mobile build outputs.
 * Writes log to specs/mobile-app/reports/artifacts/M3-bundle-secret-grep.log
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "specs/mobile-app/reports/artifacts");
const outFile = join(outDir, "M3-bundle-secret-grep.log");
const buildRoot = join(root, "apps/mobile/build");

const forbidden = [
  "volcAccessKey",
  "modelscopeApiKey",
  "sk-proj-",
  "sk-live-",
  "VITE_OPENAI",
  "VITE_VOLC",
];

function collectArtifacts(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectArtifacts(full, acc);
    } else if (/\.(hbc|js|bundle|ipa|apk|aab|json)$/i.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

mkdirSync(outDir, { recursive: true });

const artifacts = collectArtifacts(buildRoot);
const lines = [
  `# M3 bundle secret grep — ${new Date().toISOString()}`,
  `# artifact_root: ${buildRoot}`,
  `# artifacts_scanned: ${artifacts.length}`,
  "",
];

if (artifacts.length === 0) {
  lines.push("# boundary: no bundle artifacts present — scan skipped (not a PASS for live native build)");
  lines.push("# note: dev export-check HBC and gha-ipa paths used when present");
  lines.push("# exit_code: 0");
  writeFileSync(outFile, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  process.exit(0);
}

let hits = 0;

for (const file of artifacts) {
  for (const pattern of forbidden) {
    try {
      if (process.platform === "win32") {
        const content = execSync(`findstr /C:"${pattern}" "${file}"`, {
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        if (content.trim()) {
          hits += 1;
          lines.push(`HIT ${pattern} in ${file}`);
        }
      } else {
        execSync(`grep -a "${pattern}" "${file}"`, { stdio: ["pipe", "pipe", "pipe"] });
        hits += 1;
        lines.push(`HIT ${pattern} in ${file}`);
      }
    } catch {
      // no match
    }
  }
}

lines.push("");
lines.push(
  hits === 0
    ? "# summary: PASS — no forbidden key literals in scanned bundle artifacts"
    : `# summary: HARD_STOP — ${hits} forbidden literal hit(s)`,
);
lines.push(`# exit_code: ${hits === 0 ? 0 : 1}`);

writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(lines.join("\n"));
process.exit(hits === 0 ? 0 : 1);
