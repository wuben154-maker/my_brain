import { describe, expect, it } from "vitest";

import { createMockLlmProvider } from "../providers/mockFactories.js";
import { buildMockExplainFallback, resolveExplainMore } from "./explain.js";

describe("resolveExplainMore", () => {
  it("uses LLM copy when explain succeeds", async () => {
    const llm = createMockLlmProvider();
    const result = await resolveExplainMore({
      topic: "RAG",
      context: "Retrieval pipelines",
      llm,
    });

    expect(result.source).toBe("llm");
    expect(result.degraded).toBe(false);
    expect(result.text).toContain("mock-explain:RAG");
  });

  it("falls back to mock copy when LLM throws", async () => {
    const llm = createMockLlmProvider();
    llm.explain = async () => {
      throw new Error("network down");
    };

    const result = await resolveExplainMore({ topic: "向量检索", llm });

    expect(result.source).toBe("mock_fallback");
    expect(result.degraded).toBe(true);
    expect(result.text).toContain("mock");
    expect(result.text).toContain("向量检索");
  });

  it("falls back when LLM returns empty text", async () => {
    const llm = createMockLlmProvider();
    llm.explain = async () => "   ";

    const result = await resolveExplainMore({ topic: "Graph RAG", llm });

    expect(result.source).toBe("mock_fallback");
    expect(result.text).toContain("mock");
  });
});

describe("buildMockExplainFallback", () => {
  it("includes topic and does not imply ingest", () => {
    const text = buildMockExplainFallback("Rust 所有权", "borrow checker");
    expect(text).toContain("mock");
    expect(text).toContain("Rust 所有权");
    expect(text).toContain("不会自动入库");
  });
});
