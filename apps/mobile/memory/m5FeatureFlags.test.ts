import { describe, expect, it } from "vitest";

import {
  M5_FEATURE_FLAG_DEFAULTS,
  isM5ExperienceEnabled,
  resolveM5FeatureFlags,
} from "@my-brain/core";

import { M5_MOBILE_FEATURE_FLAGS } from "../config/m5FeatureFlags";

describe("M5 feature flags default-on", () => {
  it("mobile defaults enable all three experiences", () => {
    expect(M5_MOBILE_FEATURE_FLAGS.memory_weather_llm_polish).toBe(true);
    expect(M5_MOBILE_FEATURE_FLAGS.memory_replay_animations).toBe(true);
    expect(M5_MOBILE_FEATURE_FLAGS.reverse_question_enabled).toBe(true);
  });

  it("core defaults match mobile and expose weather/replay always", () => {
    expect(M5_FEATURE_FLAG_DEFAULTS).toEqual(M5_MOBILE_FEATURE_FLAGS);
    const flags = resolveM5FeatureFlags();
    expect(isM5ExperienceEnabled(flags, "weather")).toBe(true);
    expect(isM5ExperienceEnabled(flags, "replay")).toBe(true);
    expect(isM5ExperienceEnabled(flags, "reverse_question")).toBe(true);
  });

  it("no master flag disables all M5 experiences", () => {
    const keys = Object.keys(M5_MOBILE_FEATURE_FLAGS);
    expect(keys).not.toContain("signature_experiences_master");
  });
});
