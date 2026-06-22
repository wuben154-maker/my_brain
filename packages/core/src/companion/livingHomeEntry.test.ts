import { describe, expect, it } from "vitest";

import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import type { UserModeProfile } from "../domain/userMode.js";
import {
  createDefaultDegradedState,
  type DegradedModeState,
} from "../profile/correctionHistory.js";
import { buildLivingHomeEntry } from "./livingHomeEntry.js";

const profile: UserModeProfile = {
  primaryMode: "tech_tracker",
  secondaryModes: ["learner"],
  confidence: 0.82,
  recentIntent: "跟进 AI 开源动态",
};

function signal(overrides: Partial<AdaptiveSignal> = {}): AdaptiveSignal {
  return {
    sourceType: "radar",
    userModeFit: "tech_tracker",
    freshness: 0.9,
    evidenceRefs: ["radar:1"],
    confidence: 0.88,
    privacyLevel: "local_only",
    suggestedIntent: "explain_more",
    ...overrides,
  };
}

describe("buildLivingHomeEntry", () => {
  it("builds personalized lines from ranked adaptive signals", () => {
    const entry = buildLivingHomeEntry(
      profile,
      [
        signal({ freshness: 0.6, sourceType: "learning", suggestedIntent: "capture" }),
        signal({ freshness: 0.95, sourceType: "radar", suggestedIntent: "explain_more" }),
      ],
      createDefaultDegradedState(true),
    );

    expect(entry.headline).toContain("技术追踪者");
    expect(entry.headline).toContain("跟进 AI 开源动态");
    expect(entry.lines).toHaveLength(2);
    expect(entry.lines[0]?.text).toContain("雷达入口");
    expect(entry.lines[0]?.degraded).toBe(false);
  });

  it("labels degraded/mock state honestly", () => {
    const degraded: DegradedModeState = createDefaultDegradedState(false);
    const entry = buildLivingHomeEntry(profile, [signal()], degraded);

    expect(entry.lines.every((line) => line.degraded)).toBe(true);
    expect(entry.degradedBanner).toContain("演示");
  });

  it("falls back to profile intent when no signals exist", () => {
    const entry = buildLivingHomeEntry(profile, [], createDefaultDegradedState(true));

    expect(entry.lines).toHaveLength(1);
    expect(entry.lines[0]?.text).toBe("跟进 AI 开源动态");
  });

  it("uses mode label fallback when profile has no recent intent", () => {
    const bareProfile: UserModeProfile = {
      primaryMode: "learner",
      secondaryModes: [],
      confidence: 0.5,
    };
    const entry = buildLivingHomeEntry(bareProfile, [], createDefaultDegradedState(true));

    expect(entry.lines[0]?.text).toContain("学习者");
  });
});
