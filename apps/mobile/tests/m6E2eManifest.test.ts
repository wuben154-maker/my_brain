import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const E2E_DIR = join(import.meta.dirname, "..", "e2e");

/** M6 machine-scope Maestro templates — device paths marked PENDING_DEVICE in yaml tags. */
const REQUIRED_E2E_FILES = [
  "mainpath.yaml",
  "offline.yaml",
  "degraded.yaml",
  "profile-review.yaml",
  "voice-intent.yaml",
  "memory-experience.yaml",
  "persistence.yaml",
  "share-capture-android.yaml",
  "share-capture-ios.yaml",
  "share-no-permanent.yaml",
] as const;

describe("m6 e2e manifest", () => {
  it("includes M0-M5 Maestro templates", () => {
    const onDisk = readdirSync(E2E_DIR).filter((f) => f.endsWith(".yaml"));
    for (const file of REQUIRED_E2E_FILES) {
      expect(onDisk, file).toContain(file);
    }
  });

  it("each template declares appId and machine-safe tags", () => {
    for (const file of REQUIRED_E2E_FILES) {
      const text = readFileSync(join(E2E_DIR, file), "utf8");
      expect(text, file).toMatch(/appId:\s*app\.mybrain\.personal/);
      expect(text.length, file).toBeGreaterThan(20);
    }
  });

  it("share capture yaml remain PENDING_DEVICE", () => {
    for (const file of ["share-capture-android.yaml", "share-capture-ios.yaml"]) {
      const text = readFileSync(join(E2E_DIR, file), "utf8");
      expect(text).toMatch(/PENDING_DEVICE/);
    }
  });
});
