#!/usr/bin/env node
/**
 * Routes M5 audit / perf keywords to explicit vitest file lists so broad
 * name matching does not pull unrelated Expo/RN suites (M3 voice, Settings, etc.).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const args = process.argv.slice(2);

const M5_AUDIT_MARKERS = [
  "memoryweather",
  "memoryreplay",
  "reversequestion",
  "replaycoldstart",
  "m5fixture",
];

const M5_AUDIT_FILES = [
  "apps/mobile/memory/MemoryWeather.test.tsx",
  "apps/mobile/memory/MemoryReplay.test.tsx",
  "apps/mobile/memory/ReverseQuestion.test.tsx",
  "apps/mobile/memory/m5FeatureFlags.test.ts",
  "apps/mobile/memory/ConceptSoulCard.test.tsx",
  "apps/mobile/tests/weatherEvidence.test.ts",
  "apps/mobile/tests/replayEvidence.test.ts",
  "apps/mobile/tests/reverseQuestionEvidence.test.ts",
  "apps/mobile/tests/m5FixtureOutputs.test.ts",
  "apps/mobile/tests/m5EvidenceSqlite.test.ts",
  "apps/mobile/perf/replayColdStart.test.ts",
  "apps/mobile/perf/nodeBudget.test.ts",
  "apps/mobile/perf/m5LargeGraphAggregation.test.ts",
];

const PERF_FILES = [
  "apps/mobile/perf/replayColdStart.test.ts",
  "apps/mobile/perf/nodeBudget.test.ts",
  "apps/mobile/perf/m5LargeGraphAggregation.test.ts",
];

function normalized(argsList) {
  return argsList.map((value) => value.toLowerCase());
}

function isM5AuditCommand(norm) {
  return M5_AUDIT_MARKERS.every((marker) => norm.some((arg) => arg.includes(marker)));
}

function isPerfCommand(norm) {
  return norm.some((arg) => arg === "perf" || arg.includes("/perf/"));
}

function runVitest(targets) {
  const result = spawnSync(
    "pnpm",
    ["-w", "exec", "vitest", "run", ...targets],
    { cwd: root, stdio: "inherit", shell: true },
  );
  return result.status ?? 1;
}

const norm = normalized(args);

if (isM5AuditCommand(norm)) {
  process.exit(runVitest(M5_AUDIT_FILES));
}

if (isPerfCommand(norm)) {
  process.exit(runVitest(PERF_FILES));
}

process.exit(runVitest(["apps/mobile", ...args]));
