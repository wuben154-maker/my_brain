import { readFileSync, writeFileSync } from "node:fs";
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

function summarizeExperiences(experiences: ReturnType<typeof runM5Fixture>) {
  return {
    memoryWeather: {
      visible: experiences.weather.visible,
      outputKind: experiences.weather.cards[0]?.outputKind ?? null,
      evidenceRefsMin: experiences.weather.cards.reduce(
        (max, card) => Math.max(max, card.evidenceRefs.length),
        0,
      ),
    },
    memoryReplay: {
      visible: experiences.replay.visible,
      outputKind: experiences.replay.outputKind,
      evidenceRefsMin: experiences.replay.frames.reduce(
        (max, frame) => Math.max(max, frame.evidenceRefs.length),
        0,
      ),
    },
    reverseQuestion: {
      visible: experiences.reverseQuestion.visible,
      outputKind: experiences.reverseQuestion.outputKind,
      evidenceRefsMin: experiences.reverseQuestion.evidenceRefs.length,
    },
  };
}

describe("m5FixtureOutputs", () => {
  for (const fixture of M5_MODE_FIXTURES) {
    it(`${fixture.id} writes verifier-readable actual-output.json`, () => {
      const seed = loadSeed(fixture.id);
      const experiences = runM5Fixture(fixture, seed);
      const actual = {
        fixtureId: fixture.id,
        generatedAt: "2026-06-15T08:00:00Z",
        experiences: summarizeExperiences(experiences),
      };

      const outPath = join(fixturesRoot, fixture.id, "actual-output.json");
      writeFileSync(outPath, `${JSON.stringify(actual, null, 2)}\n`, "utf8");

      const written = JSON.parse(readFileSync(outPath, "utf8")) as typeof actual;
      expect(written.experiences.memoryWeather.evidenceRefsMin).toBeGreaterThanOrEqual(
        fixture.expected.memoryWeather.evidenceRefsMin,
      );
      expect(written.experiences.memoryReplay.evidenceRefsMin).toBeGreaterThanOrEqual(
        fixture.expected.memoryReplay.evidenceRefsMin,
      );
      expect(written.experiences.reverseQuestion.evidenceRefsMin).toBeGreaterThanOrEqual(
        fixture.expected.reverseQuestion.evidenceRefsMin,
      );
      if (written.experiences.memoryWeather.visible) {
        expect(written.experiences.memoryWeather.outputKind).toBe(
          fixture.expected.memoryWeather.outputKind,
        );
      }
      if (written.experiences.memoryReplay.visible) {
        expect(written.experiences.memoryReplay.outputKind).toBe(
          fixture.expected.memoryReplay.outputKind,
        );
      }
      if (written.experiences.reverseQuestion.visible) {
        expect(written.experiences.reverseQuestion.outputKind).toBe(
          fixture.expected.reverseQuestion.outputKind,
        );
      }
    });
  }
});
