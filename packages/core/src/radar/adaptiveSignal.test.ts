import { describe, expect, it } from "vitest";

import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import { rankAdaptiveSignals } from "./adaptiveRadar.js";

describe("AdaptiveSignal contract", () => {
  it("ranking prefers higher confidence and freshness", () => {
    const signals: AdaptiveSignal[] = [
      {
        sourceType: "radar",
        userModeFit: "tech_tracker",
        freshness: 0.5,
        evidenceRefs: ["a"],
        confidence: 0.6,
        privacyLevel: "local_only",
        suggestedIntent: "explain_more",
      },
      {
        sourceType: "radar",
        userModeFit: "tech_tracker",
        freshness: 0.9,
        evidenceRefs: ["b"],
        confidence: 0.9,
        privacyLevel: "local_only",
        suggestedIntent: "explain_more",
      },
    ];
    const ranked = rankAdaptiveSignals(signals);
    expect(ranked[0]?.evidenceRefs[0]).toBe("b");
  });

  it("required fields present on fixture signal", () => {
    const signal: AdaptiveSignal = {
      sourceType: "learning",
      userModeFit: "learner",
      freshness: 0.8,
      evidenceRefs: ["fixture:learner:0"],
      confidence: 0.75,
      privacyLevel: "local_only",
      suggestedIntent: "explain_more",
    };
    expect(signal.sourceType).toBeTruthy();
    expect(signal.evidenceRefs.length).toBeGreaterThan(0);
  });
});
