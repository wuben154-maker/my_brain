import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  assertLlmTextResponseShape,
} from "@/providers/llm/llmResponseShape";
import {
  createDomesticLlmProvider,
  DomesticMockLlmProvider,
} from "@/providers/llm/domesticMockLlmProvider";
import { ProviderConfigError } from "@/providers/providerConfigError";

describe("domesticMockLlmProvider", () => {
  it("complete and summarize return non-empty MOCK_LLM_RESPONSE_SHAPE", async () => {
    const llm = createDomesticLlmProvider({ apiKey: "test-key" });

    const completion = await llm.complete("讲解 RAG 用例");
    const summary = await llm.summarize("RAG 把检索和生成拼在一起。");

    assertLlmTextResponseShape(completion);
    assertLlmTextResponseShape(summary);
    expect(completion.text.length).toBeGreaterThan(0);
    expect(summary.text.length).toBeGreaterThan(0);
    expect(completion.usage?.totalTokens).toBeGreaterThan(0);
  });

  it("implements LlmProvider explainConcept with shaped text", async () => {
    const llm = createDomesticLlmProvider({ apiKey: "test-key" });
    const text = await llm.explainConcept("demo-rag", DEFAULT_USER_PROFILE);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("国内 Mock");
  });

  it("throws ProviderConfigError MISSING_API_KEY when apiKey missing", () => {
    expect(() => createDomesticLlmProvider({ apiKey: undefined })).toThrow(
      ProviderConfigError,
    );
    try {
      createDomesticLlmProvider({ apiKey: "" });
      expect.fail("expected ProviderConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderConfigError);
      expect((error as ProviderConfigError).code).toBe("MISSING_API_KEY");
    }
  });

  it("exports DomesticMockLlmProvider class with domestic id", () => {
    const llm = new DomesticMockLlmProvider({ apiKey: "x" });
    expect(llm.id).toBe("domestic-mock-llm");
  });
});
