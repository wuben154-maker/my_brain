import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { parsePersonaPresetMarkdown } from "@/persona/loadPreset";
import { loadPersonaPreset } from "@/persona/loadPreset";
import mentorRaw from "@/persona/presets/mentor.md?raw";
import {
  applyPersonaStyle,
  buildExpressionPlan,
  stylizeExplanation,
} from "@/lib/personaPrompt";

describe("personaPrompt (C4)", () => {
  it("parses preset markdown with defaults for missing fields", () => {
    const parsed = parsePersonaPresetMarkdown(
      `---\nid: mentor\nname: 测试\n---\n`,
      "mentor",
    );
    expect(parsed.id).toBe("mentor");
    expect(parsed.name).toBe("测试");
    expect(parsed.verbosity).toBe("balanced");
    expect(parsed.warmth).toBeGreaterThan(0);
  });

  it("loads three shipped presets", () => {
    expect(loadPersonaPreset("mentor").tone).toBe("calm-patient");
    expect(loadPersonaPreset("companion").verbosity).toBe("detailed");
    expect(loadPersonaPreset("geek").technicality).toBeGreaterThan(0.8);
    expect(mentorRaw).toContain("mentor");
  });

  it("buildExpressionPlan adjusts depth from profile topics", () => {
    const preset = loadPersonaPreset("mentor");
    const knownPlan = buildExpressionPlan(
      preset,
      {
        ...DEFAULT_USER_PROFILE,
        knownTopics: ["RAG"],
      },
      undefined,
      "RAG 向量检索",
    );
    const unknownPlan = buildExpressionPlan(
      preset,
      {
        ...DEFAULT_USER_PROFILE,
        unknownTopics: ["RAG"],
      },
      undefined,
      "RAG 向量检索",
    );
    expect(knownPlan.verbosity).toBe("concise");
    expect(unknownPlan.verbosity).toBe("detailed");
    expect(knownPlan.innerIntent.length).toBeGreaterThan(0);
  });

  it("applyPersonaStyle keeps facts while changing voice", () => {
    const preset = loadPersonaPreset("geek");
    const plan = buildExpressionPlan(preset, DEFAULT_USER_PROFILE);
    const fact = "Transformer 上下文窗口扩展到 128k tokens。";
    const styled = applyPersonaStyle(preset, plan, fact);
    expect(styled).toContain("128k tokens");
    expect(styled).toContain("【简版】");

    const companion = loadPersonaPreset("companion");
    const companionPlan = buildExpressionPlan(companion, DEFAULT_USER_PROFILE);
    const companionStyled = applyPersonaStyle(companion, companionPlan, fact);
    expect(companionStyled).toContain(fact);
    expect(companionStyled).not.toBe(styled);
  });

  it("stylizeExplanation picks preset from profile", () => {
    const geek = stylizeExplanation(
      { ...DEFAULT_USER_PROFILE, persona: "geek" },
      "核心事实：Agent 编排。",
      { topicHint: "Agent" },
    );
    const companion = stylizeExplanation(
      { ...DEFAULT_USER_PROFILE, persona: "companion" },
      "核心事实：Agent 编排。",
      { topicHint: "Agent" },
    );
    expect(geek).toContain("核心事实：Agent 编排。");
    expect(companion).toContain("核心事实：Agent 编排。");
    expect(geek).not.toBe(companion);
  });
});
