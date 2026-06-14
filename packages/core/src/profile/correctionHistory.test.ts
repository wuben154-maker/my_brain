import { describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import {
  applyCorrectionToProfile,
  applyProfileCorrection,
  createEmptyCorrectionState,
  isTraitVisible,
  seedTraitsFromProfile,
} from "./correctionHistory.js";

describe("profile correction history", () => {
  const profile: UserModeProfile = {
    primaryMode: "learner",
    secondaryModes: ["personal_memory"],
    confidence: 0.7,
    recentIntent: "学 Rust",
  };

  it("manual suppress hides trait", () => {
    let state = createEmptyCorrectionState();
    state = { ...state, traits: seedTraitsFromProfile(profile) };
    state = applyProfileCorrection(state, "mode-learner", "suppress", "我不是来学 Rust 的");
    expect(isTraitVisible(state, "mode-learner")).toBe(false);
    expect(state.corrections).toHaveLength(1);
    expect(state.corrections[0]?.action).toBe("suppress");
  });

  it("suppressed primary reroutes profile", () => {
    let state = createEmptyCorrectionState();
    state = { ...state, traits: seedTraitsFromProfile(profile) };
    state = applyProfileCorrection(state, "mode-learner", "suppress");
    const updated = applyCorrectionToProfile(profile, state);
    expect(updated.primaryMode).not.toBe("learner");
    expect(updated.lastCorrectionAt).toBeTruthy();
  });

  it("suppressed trait stays out until restore", () => {
    let state = createEmptyCorrectionState();
    state = { ...state, traits: seedTraitsFromProfile(profile) };
    state = applyProfileCorrection(state, "mode-learner", "suppress");
    state = applyProfileCorrection(state, "mode-learner", "restore");
    expect(isTraitVisible(state, "mode-learner")).toBe(true);
  });
});
