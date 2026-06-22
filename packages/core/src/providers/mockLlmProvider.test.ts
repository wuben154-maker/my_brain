import { describe, expect, it } from "vitest";

import { createMockLlmProvider } from "./mockFactories.js";
import { isMockStructuredJsonValue } from "./structuredJsonParse.js";
import type { LlmProvider } from "./types.js";

const REQUIRED_METHODS = [
  "summarize",
  "explain",
  "generateStructuredJson",
  "testConnection",
] as const;

function assertLlmProviderSurface(llm: LlmProvider): void {
  for (const method of REQUIRED_METHODS) {
    expect(typeof llm[method]).toBe("function");
  }
}

describe("createMockLlmProvider · parity surface", () => {
  it("exposes the extended LlmProvider contract", () => {
    const llm = createMockLlmProvider();
    assertLlmProviderSurface(llm);
    expect(llm.id).toBe("mock-llm");
  });

  it("summarize returns deterministic mock copy", async () => {
    const llm = createMockLlmProvider();
    await expect(llm.summarize("Transformer context windows keep growing")).resolves.toBe(
      "mock-summary:Transformer context windows keep growing",
    );
  });

  it("explain returns deterministic mock copy", async () => {
    const llm = createMockLlmProvider();
    await expect(llm.explain("RAG", "Used in retrieval pipelines")).resolves.toBe(
      "mock-explain:RAG:context=Used in retrieval pipelines",
    );
  });

  it("generateStructuredJson validates before returning success", async () => {
    const llm = createMockLlmProvider();
    const result = await llm.generateStructuredJson({
      prompt: "Score this headline",
      schemaHint: '{"mock":true,"prompt":"string"}',
      validate: isMockStructuredJsonValue,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mock).toBe(true);
      expect(result.value.prompt).toBe("Score this headline");
    }
  });

  it("generateStructuredJson rejects invalid schema", async () => {
    const llm = createMockLlmProvider();
    const result = await llm.generateStructuredJson({
      prompt: "Score this headline",
      validate: (value): value is { score: number } =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as { score?: unknown }).score === "number",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("PARSE_ERROR");
    }
  });

  it("testConnection stays mock/degraded and never connected", async () => {
    const llm = createMockLlmProvider();
    await expect(llm.testConnection()).resolves.toEqual({
      status: "degraded",
      errorCode: "MISSING_API_KEY",
      message: "Mock LLM — no live connection",
    });
  });
});

describe("mock/live interface parity", () => {
  it("mock provider implements the same method set as live adapter", async () => {
    const { createOpenAiCompatibleLlmProvider } = await import("./openAiCompatibleLlmProvider.js");
    const mock = createMockLlmProvider();
    const live = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-test",
      fetch: async () => ({
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({ choices: [{ message: { content: "ok" } }] }),
      }),
    });

    assertLlmProviderSurface(mock);
    assertLlmProviderSurface(live);
    for (const method of REQUIRED_METHODS) {
      expect(typeof mock[method]).toBe(typeof live[method]);
    }
  });
});
