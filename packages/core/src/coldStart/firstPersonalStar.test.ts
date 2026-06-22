import { describe, expect, it } from "vitest";

import { deriveFirstStarCandidate } from "./firstPersonalStar.js";

describe("firstPersonalStar", () => {
  it("derives star concept from latest user expression", () => {
    const candidate = deriveFirstStarCandidate(
      ["我想学 AI 语音", "顺便把项目想法记下来"],
      {
        primaryMode: "learner",
        secondaryModes: ["tech_tracker"],
        confidence: 0.82,
        recentIntent: "顺便把项目想法记下来",
      },
    );
    expect(candidate.concept).toContain("项目");
    expect(candidate.intro).toMatch(/冷启动/);
    expect(candidate.sourceLinks[0]).toMatch(/^cold-start:expression:/);
  });

  it("falls back to profile mode label when expression empty", () => {
    const candidate = deriveFirstStarCandidate([], {
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.5,
    });
    expect(candidate.concept).toContain("技术追踪者");
  });
});
