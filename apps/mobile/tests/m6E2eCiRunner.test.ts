import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  M6_REQUIRED_E2E_FILES,
  buildM6E2eCiPlan,
  classifyM6E2eFlow,
  summarizeM6E2eCiPlan,
} from "../e2e/m6E2eCiPlan";

const E2E_DIR = join(import.meta.dirname, "..", "e2e");

describe("m6 e2e ci runner plan", () => {
  it("classifies machine vs PENDING_DEVICE flows for CI quarantine", () => {
    const plan = buildM6E2eCiPlan(E2E_DIR);
    expect(plan).toHaveLength(M6_REQUIRED_E2E_FILES.length);

    const summary = summarizeM6E2eCiPlan(plan);
    expect(summary.invalid).toEqual([]);
    expect(summary.machineCi.map((flow) => flow.file)).toEqual([
      "mainpath.yaml",
      "offline.yaml",
      "degraded.yaml",
      "profile-review.yaml",
      "voice-intent.yaml",
      "memory-experience.yaml",
    ]);
    expect(summary.pendingDevice.map((flow) => flow.file)).toEqual([
      "share-capture-android.yaml",
      "share-capture-ios.yaml",
    ]);
    expect(summary.quarantineCount).toBe(2);
  });

  it("never treats PENDING_DEVICE yaml as machine_ci bucket", () => {
    for (const file of ["share-capture-android.yaml", "share-capture-ios.yaml"]) {
      const text = readFileSync(join(E2E_DIR, file), "utf8");
      const flow = classifyM6E2eFlow(file, text);
      expect(flow.tags).toContain("PENDING_DEVICE");
      expect(flow.bucket).toBe("pending_device");
    }
  });

  it("requires appId on every M6 required flow", () => {
    for (const flow of buildM6E2eCiPlan(E2E_DIR)) {
      expect(flow.errors, flow.file).toEqual([]);
      expect(flow.appId, flow.file).toBe("app.mybrain.personal");
    }
  });
});
