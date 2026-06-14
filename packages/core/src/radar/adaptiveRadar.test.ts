import { describe, expect, it } from "vitest";

import {
  COLD_START_FIXTURES,
  generateAdaptiveSignals,
  inferUserModeProfileFromDialogue,
} from "./adaptiveRadar.js";

describe("cold start routing", () => {
  for (const fixture of COLD_START_FIXTURES) {
    it(`routes ${fixture.id}`, () => {
      const profile = inferUserModeProfileFromDialogue([fixture.userUtterance], fixture.id);
      expect(profile.primaryMode).toBe(fixture.expectedPrimary);
      if (fixture.expectedSecondary) {
        expect(profile.secondaryModes).toEqual(fixture.expectedSecondary);
      }
    });
  }

  it("mixed mode generates blended signals", () => {
    const profile = inferUserModeProfileFromDialogue(
      ["学 Rust 也想记生活灵感"],
      "cold-mixed-learner-life",
    );
    const signals = generateAdaptiveSignals(profile);
    expect(signals.length).toBeGreaterThan(0);
    const types = new Set(signals.map((s) => s.sourceType));
    expect(types.has("learning") || types.has("capture")).toBe(true);
  });

  it("tech tracker differs from learner radar", () => {
    const tech = generateAdaptiveSignals(
      inferUserModeProfileFromDialogue([], "cold-tech-tracker"),
    );
    const learner = generateAdaptiveSignals(
      inferUserModeProfileFromDialogue([], "cold-learner"),
    );
    expect(tech[0]?.sourceType).not.toBe(learner[0]?.sourceType);
  });

  it("suppression removes mode signals", () => {
    const profile = inferUserModeProfileFromDialogue([], "cold-learner");
    const suppressed = generateAdaptiveSignals(profile, ["mode-learner"]);
    expect(suppressed.every((s) => s.userModeFit !== "learner")).toBe(true);
  });
});
