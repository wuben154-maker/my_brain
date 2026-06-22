import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const E2E_DIR = join(import.meta.dirname, "..", "e2e");

/** M7B Maestro templates — tracked separately from M6 required list. */
export const M7B_E2E_FILES = ["sync-conflict.yaml", "profile-review-persist.yaml"] as const;

describe("m7b e2e manifest", () => {
  it("includes M7B Maestro templates on disk", () => {
    const onDisk = readdirSync(E2E_DIR).filter((f) => f.endsWith(".yaml"));
    for (const file of M7B_E2E_FILES) {
      expect(onDisk, file).toContain(file);
    }
  });

  it("each M7B template declares appId and PENDING_DEVICE tags", () => {
    for (const file of M7B_E2E_FILES) {
      const text = readFileSync(join(E2E_DIR, file), "utf8");
      expect(text, file).toMatch(/appId:\s*app\.mybrain\.personal/);
      expect(text, file).toMatch(/PENDING_DEVICE/);
      expect(text, file).toMatch(/M7B/);
    }
  });

  it("sync-conflict yaml references Settings M7B testIDs", () => {
    const text = readFileSync(join(E2E_DIR, "sync-conflict.yaml"), "utf8");
    for (const testId of [
      "m7b-sync-merge",
      "m7b-sync-conflict-panel",
      "m7b-keep-local-correction",
      "m7b-sync-status",
    ]) {
      expect(text).toContain(testId);
    }
  });
});
