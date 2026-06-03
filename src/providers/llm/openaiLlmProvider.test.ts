import { describe, expect, it, vi } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createMockLlmProvider } from "./mockLlmProvider";
import {
  OpenAiLlmError,
  createOpenAiLlmProvider,
  hasOpenAiLlmApiKey,
} from "./openaiLlmProvider";
import { createLlmProvider } from "@/providers";

vi.mock("@/lib/llmProviderMode", () => ({
  readLlmProviderMode: vi.fn(() => "mock" as const),
}));

describe("OpenAiLlmProvider · fail-fast ingest/research", () => {
  const ingestContext = JSON.stringify({
    newsItem: {
      id: "n1",
      title: "Test",
      summary: "Summary",
      sourceUrl: "https://example.com",
      sourceName: "Mock",
      category: "ai_news",
      publishedAt: null,
    },
    nodes: [],
  });

  it("hasOpenAiLlmApiKey rejects blank keys", () => {
    expect(hasOpenAiLlmApiKey({ apiKey: "sk-test" })).toBe(true);
    expect(hasOpenAiLlmApiKey({ apiKey: "" })).toBe(false);
    expect(hasOpenAiLlmApiKey({ apiKey: "   " })).toBe(false);
  });

  it("proposeGraphMutations throws not_implemented when configured", async () => {
    const llm = createOpenAiLlmProvider({ apiKey: "sk-test" });
    await expect(llm.proposeGraphMutations(ingestContext)).rejects.toMatchObject({
      name: "OpenAiLlmError",
      code: "not_implemented",
    } satisfies Partial<OpenAiLlmError>);
  });

  it("planResearch throws not_implemented instead of empty plan", async () => {
    const llm = createOpenAiLlmProvider({ apiKey: "sk-test" });
    await expect(
      llm.planResearch("RAG", DEFAULT_USER_PROFILE),
    ).rejects.toMatchObject({
      code: "not_implemented",
    });
  });

  it("synthesizeConcepts allows empty evidence without API", async () => {
    const llm = createOpenAiLlmProvider({ apiKey: "sk-test" });
    await expect(llm.synthesizeConcepts([])).resolves.toEqual([]);
    await expect(llm.synthesizeConcepts(["", "  "])).resolves.toEqual([]);
  });

  it("synthesizeConcepts throws when evidence is non-empty", async () => {
    const llm = createOpenAiLlmProvider({ apiKey: "sk-test" });
    await expect(llm.synthesizeConcepts(["GitHub Agent 框架"])).rejects.toMatchObject({
      code: "not_implemented",
    });
  });

  it("distillUserProfile throws not_implemented", async () => {
    const llm = createOpenAiLlmProvider({ apiKey: "sk-test" });
    await expect(
      llm.distillUserProfile("用户：我对 RAG 感兴趣", DEFAULT_USER_PROFILE),
    ).rejects.toMatchObject({
      code: "not_implemented",
    });
  });

  it("missing api key throws missing_api_key on ingest paths", async () => {
    const llm = createOpenAiLlmProvider({ apiKey: "" });
    await expect(llm.proposeGraphMutations(ingestContext)).rejects.toMatchObject({
      code: "missing_api_key",
    });
  });
});

describe("createLlmProvider · openai without key", () => {
  it("degrades to mock LLM and can propose ingest", async () => {
    const { readLlmProviderMode } = await import("@/lib/llmProviderMode");
    vi.mocked(readLlmProviderMode).mockReturnValue("openai");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const llm = createLlmProvider({ openAiApiKey: "" });
    expect(llm.id).toBe("mock-llm");
    expect(warn).toHaveBeenCalled();

    const mock = createMockLlmProvider();
    const context = JSON.stringify({
      newsItem: {
        id: "n1",
        title: "Transformer 上下文窗口再扩展",
        summary: "更长 context。",
        sourceUrl: "https://example.com",
        sourceName: "Mock RSS",
        category: "ai_news",
        publishedAt: null,
      },
      nodes: [],
    });
    const proposals = await llm.proposeGraphMutations(context);
    const expected = await mock.proposeGraphMutations(context);
    expect(proposals).toEqual(expected);
    expect(proposals.length).toBeGreaterThan(0);

    warn.mockRestore();
    vi.mocked(readLlmProviderMode).mockReturnValue("mock");
  });
});
