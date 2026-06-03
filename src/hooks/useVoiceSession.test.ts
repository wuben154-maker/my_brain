/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import * as profileDistillation from "@/lib/profileDistillation";
import { createAppProviders } from "@/providers";
import { useAppStore } from "@/stores/appStore";

describe("useVoiceSession disconnect / profile distill", () => {
  beforeEach(() => {
    useAppStore.setState({
      phase: "ready",
      providers: null,
      storage: null,
    });
  });

  async function connectWithUserSpeech() {
    const { storage, cleanup } = createTempStorage();
    await storage.init();
    const providers = createAppProviders({ openAiApiKey: "" });
    useAppStore.setState({ providers, storage });
    const hook = renderHook(() => useVoiceSession());
    await act(async () => {
      await hook.result.current.connect();
    });
    await act(async () => {
      hook.result.current.simulateUserSpeech("我对 RAG 感兴趣");
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    });
    return { hook, cleanup, voice: providers.voice };
  }

  it("keeps transcript and records error when storage/llm unavailable", async () => {
    const { hook, cleanup, voice } = await connectWithUserSpeech();
    try {
      expect(hook.result.current.transcripts.length).toBeGreaterThan(0);
      useAppStore.setState({ storage: null });
      await act(async () => {
        await hook.result.current.disconnect();
      });
      expect(hook.result.current.transcripts.length).toBeGreaterThan(0);
      expect(hook.result.current.errorMessage).toContain("用户画像蒸馏不可用");
    } finally {
      await voice.disconnect();
      cleanup();
    }
  });

  it("keeps transcript and records error when distillation throws", async () => {
    const distillSpy = vi
      .spyOn(profileDistillation, "distillAndPersistUserProfile")
      .mockRejectedValue(new Error("蒸馏 API 失败"));
    const { hook, cleanup, voice } = await connectWithUserSpeech();
    try {
      expect(hook.result.current.transcripts.length).toBeGreaterThan(0);
      await act(async () => {
        await hook.result.current.disconnect();
      });
      expect(hook.result.current.transcripts.length).toBeGreaterThan(0);
      expect(hook.result.current.errorMessage).toBe("蒸馏 API 失败");
    } finally {
      distillSpy.mockRestore();
      await voice.disconnect();
      cleanup();
    }
  });
});
