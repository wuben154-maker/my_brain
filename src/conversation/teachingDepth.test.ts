import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { RAG_BASIC_DEFINITION_SUBSTRING } from "@/domain/profile/userProfile";
import {
  buildProfileTeachingRationale,
  buildTeachingTurn,
  profileBaseElaborationDepth,
  teachingTurnIncludesBasicDefinition,
} from "@/conversation/teachingDepth";

describe("teachingDepth", () => {
  it("heard level includes use-case framing without basic definition", () => {
    const text = buildTeachingTurn("demo-rag", DEFAULT_USER_PROFILE);
    expect(teachingTurnIncludesBasicDefinition(text)).toBe(false);
    expect(text).toContain("用例");
  });

  it("unfamiliar level includes RAG basic definition substring", () => {
    const profile = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "unfamiliar" as const },
    };
    const text = buildTeachingTurn("demo-rag", profile);
    expect(text).toContain(RAG_BASIC_DEFINITION_SUBSTRING);
  });

  it("PROFILE_CORRECTION_GOLDEN: can_explain excludes basic definition", () => {
    const profile = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "can_explain" as const },
    };
    const text = buildTeachingTurn("demo-rag", profile);
    expect(teachingTurnIncludesBasicDefinition(text)).toBe(false);
    expect(text).toContain("架构取舍");
  });

  it("buildProfileTeachingRationale includes signal and profile summary", () => {
    const lines = buildProfileTeachingRationale(DEFAULT_USER_PROFILE, {
      worldItemId: "radar-wi-rel-1",
      reasonCode: "project_adjacent",
      explanation: "涉及实时语音。",
      linkedNodeIds: ["demo-agent"],
      score: 0.9,
    });
    expect(lines.some((line) => line.includes("推荐依据"))).toBe(true);
    expect(lines.some((line) => line.includes("RAG 理解"))).toBe(true);
  });

  it("profileBaseElaborationDepth increases with understanding level", () => {
    const unfamiliar = profileBaseElaborationDepth(
      {
        ...DEFAULT_USER_PROFILE,
        understanding: { "demo-rag": "unfamiliar" },
      },
      "demo-rag",
    );
    const canExplain = profileBaseElaborationDepth(
      {
        ...DEFAULT_USER_PROFILE,
        understanding: { "demo-rag": "can_explain" },
      },
      "demo-rag",
    );
    expect(canExplain).toBeGreaterThan(unfamiliar);
  });
});
