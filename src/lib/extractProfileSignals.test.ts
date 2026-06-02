import { describe, expect, it } from "vitest";
import { extractProfileSignalsFromTranscript } from "@/lib/extractProfileSignals";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";

describe("extractProfileSignalsFromTranscript", () => {
  it("extracts interests and explanation style from user lines", () => {
    const transcript = [
      "用户: 我叫小明，我对 AI Agent 很感兴趣",
      "助手: 好的",
      "用户: 不太懂 RAG，请讲得细一点，保留英文术语",
    ].join("\n");

    const signals = extractProfileSignalsFromTranscript(transcript);
    expect(signals.displayName).toBe("小明");
    expect(signals.interests).toContain("AI Agent");
    expect(signals.unknownTopics).toContain("RAG");
    expect(signals.explanationStyle).toBe("通俗中文 + 保留英文术语");
  });

  it("ignores assistant-only transcript", () => {
    const signals = extractProfileSignalsFromTranscript("助手: 你好");
    expect(signals.interests).toHaveLength(0);
  });
});

describe("MockLlmProvider.distillUserProfile", () => {
  const llm = createMockLlmProvider();

  it("merges signals into persisted profile shape", async () => {
    const transcript = "用户: 今天有什么 AI 资讯？我懂 Python，不太了解 Transformer\n";
    const next = await llm.distillUserProfile(transcript, DEFAULT_USER_PROFILE);

    expect(next.interests).toContain("AI 资讯与 GitHub 趋势");
    expect(next.knownTopics.some((topic) => /python/i.test(topic))).toBe(true);
    expect(next.unknownTopics.some((topic) => /transformer/i.test(topic))).toBe(
      true,
    );
    expect(next.updatedAt).not.toBe(DEFAULT_USER_PROFILE.updatedAt);
  });
});
