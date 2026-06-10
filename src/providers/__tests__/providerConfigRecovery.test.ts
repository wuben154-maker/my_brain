import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLlmProvider } from "@/providers";
import { createConfiguredLlmProvider } from "@/providers/providerConfigRecovery";
import { MISSING_API_KEY_FALLBACK_WARNING } from "@/providers/providerConfigRecovery";
import { ProviderConfigError } from "@/providers/providerConfigError";
import { createDomesticLlmProvider } from "@/providers/llm/domesticMockLlmProvider";

vi.mock("@/lib/llmProviderMode", () => ({
  readLlmProviderMode: vi.fn(() => "mock" as const),
}));

describe("providerConfigRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("factory throws MISSING_API_KEY for domestic provider without key", () => {
    expect(() => createDomesticLlmProvider({ apiKey: undefined })).toThrow(
      ProviderConfigError,
    );
    expect(() =>
      createDomesticLlmProvider({ apiKey: undefined }),
    ).toThrowError(expect.objectContaining({ code: "MISSING_API_KEY" }));
  });

  it("createConfiguredLlmProvider propagates MISSING_API_KEY in domestic-mock mode", async () => {
    const { readLlmProviderMode } = await import("@/lib/llmProviderMode");
    vi.mocked(readLlmProviderMode).mockReturnValue("domestic-mock");

    expect(() =>
      createConfiguredLlmProvider({ openAiApiKey: "", domesticLlmApiKey: "" }),
    ).toThrowError(expect.objectContaining({ code: "MISSING_API_KEY" }));
  });

  it("aggregation catches MISSING_API_KEY and falls back to mock with explicit warning", async () => {
    const { readLlmProviderMode } = await import("@/lib/llmProviderMode");
    vi.mocked(readLlmProviderMode).mockReturnValue("domestic-mock");

    const warnings: string[] = [];
    const llm = createLlmProvider(
      { openAiApiKey: "", domesticLlmApiKey: "" },
      { warn: (message) => warnings.push(message) },
    );

    expect(llm.id).toBe("mock-llm");
    expect(warnings).toContain(MISSING_API_KEY_FALLBACK_WARNING);

    const proposals = await llm.proposeGraphMutations("{}");
    expect(Array.isArray(proposals)).toBe(true);
  });

  it("openai mode without key still degrades to mock with warning", async () => {
    const { readLlmProviderMode } = await import("@/lib/llmProviderMode");
    vi.mocked(readLlmProviderMode).mockReturnValue("openai");

    const warnings: string[] = [];
    const llm = createLlmProvider(
      { openAiApiKey: "" },
      { warn: (message) => warnings.push(message) },
    );

    expect(llm.id).toBe("mock-llm");
    expect(warnings.some((line) => line.includes("VITE_OPENAI_API_KEY"))).toBe(
      true,
    );
  });

  it("modelscope mode without key degrades to mock with warning", async () => {
    const { readLlmProviderMode } = await import("@/lib/llmProviderMode");
    vi.mocked(readLlmProviderMode).mockReturnValue("modelscope");

    const warnings: string[] = [];
    const llm = createLlmProvider(
      { openAiApiKey: "", modelscopeApiKey: "" },
      { warn: (message) => warnings.push(message) },
    );

    expect(llm.id).toBe("mock-llm");
    expect(warnings.some((line) => line.toLowerCase().includes("modelscope"))).toBe(
      true,
    );
  });
});

describe("provider layer boundary scan", () => {
  it("provider manifest domestic entry lists contract env keys", async () => {
    const { getProviderManifest } = await import("@/providers/providerManifest");
    const manifest = getProviderManifest("domestic-mock-llm");
    expect(manifest?.envKeys).toEqual([
      "DOMESTIC_LLM_API_KEY",
      "DOMESTIC_LLM_BASE_URL",
    ]);
    expect(manifest?.docs).toContain("PROVIDER_PLUGIN_CONTRACT.md#domestic-mock");
  });
});
