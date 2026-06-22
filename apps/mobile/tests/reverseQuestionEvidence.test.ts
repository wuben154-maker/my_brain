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

describe("reverseQuestionEvidence mobile gate", () => {
  for (const fixture of M5_MODE_FIXTURES) {
    it(`${fixture.id} reverse question uses node evidence`, () => {
      const experiences = runM5Fixture(fixture, loadSeed(fixture.id));
      expect(experiences.reverseQuestion.visible).toBe(true);
      expect(experiences.reverseQuestion.outputKind).toBe(
        fixture.expected.reverseQuestion.outputKind,
      );
      expect(experiences.reverseQuestion.evidenceRefs.length).toBeGreaterThanOrEqual(
        fixture.expected.reverseQuestion.evidenceRefsMin,
      );
      expect(experiences.reverseQuestion.prompt.length).toBeGreaterThan(0);
    });
  }

  it("hides when seed has no nodes", () => {
    const fixture = M5_MODE_FIXTURES.find((f) => f.id === "m5-tech-tracker")!;
    const experiences = runM5Fixture(fixture, { graphChanges: [], nodes: [] });
    expect(experiences.reverseQuestion.visible).toBe(false);
  });
});
