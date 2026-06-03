import { describe, expect, it, vi } from "vitest";
import { createOpenAiLlmProvider } from "./openaiLlmProvider";
import {
  isRelationType,
  parseConceptCandidatesJson,
  parseResearchPlanJson,
} from "./researchStructuredOutput";

describe("researchStructuredOutput", () => {
  it("parses a valid research plan", () => {
    const raw = JSON.stringify({
      topic: "RAG",
      subQuestions: ["什么是 RAG？", "与向量库关系？"],
      suggestedSources: ["news_registry"],
    });
    expect(parseResearchPlanJson(raw)).toEqual({
      topic: "RAG",
      subQuestions: ["什么是 RAG？", "与向量库关系？"],
      suggestedSources: ["news_registry"],
    });
  });

  it("returns null for truncated JSON without throwing", () => {
    expect(parseResearchPlanJson('{"topic":"RAG","subQuestions":[')).toBeNull();
  });

  it("returns null for illegal JSON without throwing", () => {
    expect(parseResearchPlanJson("not-json")).toBeNull();
    expect(parseResearchPlanJson("")).toBeNull();
  });

  it("parses concept candidates and filters invalid relation types", () => {
    const raw = JSON.stringify([
      {
        title: "RAG",
        intro: "检索增强生成",
        sourceUrl: null,
        relations: [
          { targetTitle: "向量库", relationType: "depends_on" },
          { targetTitle: "噪声", relationType: "invalid_type" },
          { targetTitle: "", relationType: "related" },
        ],
      },
    ]);
    const candidates = parseConceptCandidatesJson(raw);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.relations).toEqual([
      { targetTitle: "向量库", relationType: "depends_on" },
    ]);
  });

  it("returns empty array for truncated concept JSON", () => {
    expect(parseConceptCandidatesJson("[{\"title\":\"RAG\"")).toEqual([]);
  });

  it("returns empty array for illegal concept JSON", () => {
    expect(parseConceptCandidatesJson("{")).toEqual([]);
  });

  it("isRelationType accepts only domain enum values", () => {
    expect(isRelationType("related")).toBe(true);
    expect(isRelationType("depends_on")).toBe(true);
    expect(isRelationType("foo")).toBe(false);
  });

  it("parseConceptCandidatesJson never throws on garbage input", () => {
    expect(() => parseConceptCandidatesJson("<<<{")).not.toThrow();
  });

  it("parseResearchPlanJson never throws on garbage input", () => {
    expect(() => parseResearchPlanJson("<<<{")).not.toThrow();
  });

  it("logs parse failure without throwing from openai helper path", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = createOpenAiLlmProvider({ apiKey: "test" });
    const result = provider.parsePlanResponse("{bad", "Fallback");
    expect(result.topic).toBe("Fallback");
    expect(result.subQuestions).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
