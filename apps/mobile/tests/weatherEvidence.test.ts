import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  M5_MODE_FIXTURES,
  runM5Fixture,
  type M5FixtureSeedData,
} from "@my-brain/core";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "..", "fixtures", "m5-modes");

function loadSeed(fixtureId: string): M5FixtureSeedData {
  const normalized = join(fixturesRoot, fixtureId, "seed.json");
  return JSON.parse(readFileSync(normalized, "utf8")) as M5FixtureSeedData;
}

describe("weatherEvidence mobile gate", () => {
  for (const fixture of M5_MODE_FIXTURES) {
    it(`${fixture.id} weather has evidence or hides`, () => {
      const seed = loadSeed(fixture.id);
      const experiences = runM5Fixture(fixture, seed);
      if (experiences.weather.visible) {
        expect(experiences.weather.cards.length).toBeGreaterThanOrEqual(
          fixture.expected.memoryWeather.evidenceRefsMin,
        );
        for (const card of experiences.weather.cards) {
          expect(card.evidenceRefs.length).toBeGreaterThan(0);
        }
        expect(experiences.weather.cards[0]?.outputKind).toBe(
          fixture.expected.memoryWeather.outputKind,
        );
      }
    });
  }
});
