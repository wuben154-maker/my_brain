import { describe, expect, it } from "vitest";
import { buildTeachingTurn } from "@/conversation/teachingDepth";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  assertLlmTextResponseShape,
  wrapTextAsLlmResponse,
} from "@/providers/llm/llmResponseShape";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { domesticMockLlmProvider } from "@/providers/llm/domesticMockLlmProvider";
import { createMockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import { getProviderManifest } from "@/providers/providerManifest";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";

describe("mockParity", () => {
  const heardProfile = {
    ...DEFAULT_USER_PROFILE,
    understanding: { "demo-rag": "heard" as const },
  };

  it("mock vs domestic mock LLM share MOCK_LLM_RESPONSE_SHAPE on teaching harness", async () => {
    const teachingPrompt = buildTeachingTurn("demo-rag", heardProfile);
    expect(teachingPrompt.length).toBeGreaterThan(0);

    const mockLlm = createMockLlmProvider();
    const mockText = await mockLlm.explainConcept("demo-rag", heardProfile);
    const mockShape = wrapTextAsLlmResponse(mockText);

    const domesticShape = await domesticMockLlmProvider.complete(teachingPrompt);

    assertLlmTextResponseShape(mockShape);
    assertLlmTextResponseShape(domesticShape);
    expect(mockShape.text.length).toBeGreaterThan(0);
    expect(domesticShape.text.length).toBeGreaterThan(0);
    expect(typeof mockShape.text).toBe(typeof domesticShape.text);
    if (domesticShape.usage !== undefined) {
      expect(typeof domesticShape.usage).toBe("object");
    }
  });

  it("voice manifest mock exposes speak/interrupt/setVoice surface", () => {
    const voice = new MockVoiceProvider();
    expect(voice.id).toBe("mock-voice");
    expect(typeof voice.speak).toBe("function");
    expect(typeof voice.interrupt).toBe("function");
    expect(typeof voice.setVoice).toBe("function");

    const manifest = getProviderManifest("mock-voice");
    const fromManifest = manifest?.mockImpl();
    expect(fromManifest).toBeInstanceOf(MockVoiceProvider);
  });

  it("news manifest mock returns fetchable registry shape", async () => {
    const manifest = getProviderManifest("fixture-world-source");
    const registry = manifest?.mockImpl();
    expect(registry && "fetchAll" in registry).toBe(true);
    if (!registry || !("fetchAll" in registry)) {
      return;
    }
    const results = await registry.fetchAll();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.items?.length).toBeGreaterThan(0);
  });

  it("memory manifest mock exposes recall/remember/health surface", async () => {
    const manifest = getProviderManifest("mock-memory");
    const memory = manifest?.mockImpl();
    expect(memory && "recall" in memory && "remember" in memory).toBe(true);
    if (!memory || !("recall" in memory) || !("remember" in memory)) {
      return;
    }

    await memory.remember([
      { kind: "fact", text: "parity memory item", timestamp: Date.now() },
    ]);
    const recalled = await memory.recall({ query: "parity", topK: 1 });
    expect(recalled.length).toBeGreaterThan(0);

    const direct = createMockMemoryProvider();
    expect(typeof direct.health).toBe("function");
  });
});
