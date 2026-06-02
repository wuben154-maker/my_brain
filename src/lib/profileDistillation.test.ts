import { describe, expect, it, vi } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  distillAndPersistUserProfile,
  formatConversationTranscript,
  hasUserSpeech,
} from "@/lib/profileDistillation";
import type { LlmProvider } from "@/providers/llm/types";
import type { StorageProvider } from "@/storage/types";

describe("profileDistillation", () => {
  it("formats transcript with role labels", () => {
    const text = formatConversationTranscript([
      { role: "user", text: "你好", final: true },
      { role: "assistant", text: "嗨", final: true },
    ]);
    expect(text).toBe("用户: 你好\n助手: 嗨");
  });

  it("persists distilled profile before discard", async () => {
    const saveUserProfile = vi.fn(async () => undefined);
    const loadUserProfile = vi.fn(async () => DEFAULT_USER_PROFILE);
    const storage = {
      loadUserProfile,
      saveUserProfile,
    } as unknown as StorageProvider;

    const distillUserProfile = vi.fn(async () => ({
      ...DEFAULT_USER_PROFILE,
      interests: ["AI 资讯与 GitHub 趋势"],
      updatedAt: "2026-06-01T12:00:00.000Z",
    }));
    const llm = { distillUserProfile } as unknown as LlmProvider;

    const next = await distillAndPersistUserProfile(
      storage,
      llm,
      "用户: 今天有什么 AI 资讯？",
    );

    expect(distillUserProfile).toHaveBeenCalledOnce();
    expect(saveUserProfile).toHaveBeenCalledWith(next);
    expect(next.interests).toContain("AI 资讯与 GitHub 趋势");
  });

  it("detects user speech in transcript lines", () => {
    expect(hasUserSpeech([{ role: "assistant", text: "hi", final: true }])).toBe(
      false,
    );
    expect(hasUserSpeech([{ role: "user", text: "hello", final: true }])).toBe(
      true,
    );
  });
});
