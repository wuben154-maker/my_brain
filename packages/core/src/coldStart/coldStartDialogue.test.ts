import { describe, expect, it } from "vitest";

import {
  COLD_START_MIN_USER_TURNS,
  coldStartAssistantReply,
  formatProfileModeLine,
  inferColdStartProfile,
  isColdStartDialogueComplete,
  cyclePrimaryMode,
} from "./coldStartDialogue.js";

describe("coldStartDialogue", () => {
  it("requires three user turns before profile phase", () => {
    expect(COLD_START_MIN_USER_TURNS).toBe(3);
    expect(isColdStartDialogueComplete(2)).toBe(false);
    expect(isColdStartDialogueComplete(3)).toBe(true);
  });

  it("returns distinct assistant replies for turns 1–3", () => {
    const r1 = coldStartAssistantReply(1);
    const r2 = coldStartAssistantReply(2);
    const r3 = coldStartAssistantReply(3);
    expect(r1).not.toBe(r2);
    expect(r2).not.toBe(r3);
    expect(r1.length).toBeGreaterThan(4);
  });

  it("infers profile from natural utterances without fixture id", () => {
    const profile = inferColdStartProfile(["我想系统学一下 AI 语音", "顺便记项目想法"]);
    expect(profile.primaryMode).toBeTruthy();
    expect(profile.confidence).toBeGreaterThan(0);
    expect(formatProfileModeLine(profile)).toMatch(/\+|学习者|技术追踪者|个人记忆/);
  });

  it("cycles primary mode for user correction", () => {
    expect(cyclePrimaryMode("learner")).toBe("tech_tracker");
    expect(cyclePrimaryMode("tech_tracker")).toBe("personal_memory");
  });
});
