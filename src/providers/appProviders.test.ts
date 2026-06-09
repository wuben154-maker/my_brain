import { describe, expect, it } from "vitest";
import { createAppProviders } from "@/providers";
import { MockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";

describe("createAppProviders", () => {
  it("forceMock returns only local mock providers and no live news sources", () => {
    const providers = createAppProviders(
      {
        openAiApiKey: "live-key-that-must-not-be-used",
        everMemOsBaseUrl: "https://example.invalid",
        everMemOsApiKey: "memory-key-that-must-not-be-used",
      },
      { forceMock: true },
    );

    expect(providers.voice).toBeInstanceOf(MockVoiceProvider);
    expect(providers.llm).toBeInstanceOf(MockLlmProvider);
    expect(providers.memory).toBeInstanceOf(MockMemoryProvider);
    expect(providers.news.list()).toEqual([]);
  });
});
