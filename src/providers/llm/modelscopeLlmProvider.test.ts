import { describe, expect, it } from "vitest";
import { createModelScopeLlmProvider } from "./modelscopeLlmProvider";
import { ProviderConfigError } from "@/providers/providerConfigError";

describe("ModelScopeLlmProvider", () => {
  it("throws MISSING_API_KEY when api key absent", () => {
    expect(() => createModelScopeLlmProvider({ apiKey: "" })).toThrow(
      ProviderConfigError,
    );
  });

  it("uses OpenAI-compatible defaults", () => {
    const provider = createModelScopeLlmProvider({ apiKey: "test-key" });
    expect(provider.id).toBe("modelscope-chat");
  });
});
