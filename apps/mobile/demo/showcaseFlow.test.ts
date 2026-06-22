import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SHOWCASE_FLOW_STEPS } from "@my-brain/core";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function collectMobileSources(dir: string): string {
  let out = "";
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) {
        continue;
      }
      out += collectMobileSources(full);
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      out += readFileSync(full, "utf8");
      out += "\n";
    }
  }
  return out;
}

describe("showcaseFlow", () => {
  it("defines seven showcase steps with fixture contract", () => {
    expect(SHOWCASE_FLOW_STEPS).toHaveLength(7);
    for (const step of SHOWCASE_FLOW_STEPS) {
      expect(step.sceneId).toBeTruthy();
      expect(step.testIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("static showcase testIds exist in mobile source", () => {
    const sources = collectMobileSources(mobileRoot);
    const barSource = readFileSync(
      join(mobileRoot, "components/ui/ContextDecisionBar.tsx"),
      "utf8",
    );
    const dynamicOk: Record<string, boolean> = {
      "context-decision-bar-ingest": barSource.includes("${testID}-${action.key}"),
      "memory-weather-evidence": sources.includes("${testID}-evidence"),
      "memory-replay-evidence": sources.includes('testID = "memory-replay"'),
      "provider-status-llm": sources.includes("PROVIDER_STATUS_TEST_IDS"),
    };
    const staticIds = SHOWCASE_FLOW_STEPS.flatMap((step) =>
      step.testIds.filter((id) => !id.includes("demo-provisional")),
    );
    for (const testId of staticIds) {
      if (dynamicOk[testId]) {
        continue;
      }
      expect(sources, `missing testID ${testId} in mobile sources`).toContain(testId);
    }
  });
});
