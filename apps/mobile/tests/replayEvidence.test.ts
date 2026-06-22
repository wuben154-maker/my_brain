import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { M5_MODE_FIXTURES, runM5Fixture, type M5FixtureSeedData } from "@my-brain/core";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "..", "fixtures", "m5-modes");

function loadSeed(fixtureId: string): M5FixtureSeedData {
  const normalized = join(fixturesRoot, fixtureId, "seed.json");
  return JSON.parse(readFileSync(normalized, "utf8")) as M5FixtureSeedData;
}

describe("replayEvidence mobile gate", () => {
  for (const fixture of M5_MODE_FIXTURES) {
    it(`${fixture.id} replay frames bind graph change ids`, () => {
      const experiences = runM5Fixture(fixture, loadSeed(fixture.id));
      expect(experiences.replay.visible).toBe(true);
      expect(experiences.replay.outputKind).toBe(fixture.expected.memoryReplay.outputKind);
      expect(experiences.replay.frames.length).toBeGreaterThanOrEqual(
        fixture.expected.memoryReplay.evidenceRefsMin,
      );
      for (const frame of experiences.replay.frames) {
        expect(frame.evidenceRefs[0]).toMatch(/^graph_change:|^capture:/);
      }
    });
  }
});
