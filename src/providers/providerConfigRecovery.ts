import { readLlmProviderMode } from "@/lib/llmProviderMode";
import { createDomesticLlmProvider } from "./llm/domesticMockLlmProvider";
import { createMockLlmProvider } from "./llm/mockLlmProvider";
import { createOpenAiLlmProvider } from "./llm/openaiLlmProvider";
import type { LlmProvider } from "./llm/types";
import { isMissingApiKeyError } from "./providerConfigError";
import type { CreateAppProvidersOptions, ProviderEnv } from "./providerTypes";

export const MISSING_API_KEY_FALLBACK_WARNING =
  "[my-brain] domestic-mock LLM 缺少 API Key，已降级为 mock LLM";

export type ResolveLlmProviderOptions = CreateAppProvidersOptions;

/** Factory layer: may throw ProviderConfigError (MISSING_API_KEY). */
export function createConfiguredLlmProvider(env: ProviderEnv): LlmProvider {
  const mode = readLlmProviderMode();

  if (mode === "domestic-mock") {
    return createDomesticLlmProvider({
      apiKey: env.domesticLlmApiKey,
      baseUrl: env.domesticLlmBaseUrl,
    });
  }

  if (mode !== "openai") {
    return createMockLlmProvider();
  }

  return createOpenAiLlmProvider({
    apiKey: env.openAiApiKey,
    model: env.openAiLlmModel,
  });
}

/** Aggregation layer: never throws MISSING_API_KEY — falls back to mock + warning. */
export function resolveLlmProviderWithFallback(
  env: ProviderEnv,
  options: ResolveLlmProviderOptions = {},
): LlmProvider {
  const warn = options.warn ?? ((message: string) => console.warn(message));

  if (options.forceMock) {
    return createMockLlmProvider();
  }

  const mode = readLlmProviderMode();

  if (mode === "openai" && !env.openAiApiKey.trim()) {
    warn(
      "[my-brain] VITE_LLM_PROVIDER=openai 但未配置 VITE_OPENAI_API_KEY，已降级为 mock LLM",
    );
    return createMockLlmProvider();
  }

  try {
    return createConfiguredLlmProvider(env);
  } catch (error) {
    if (isMissingApiKeyError(error)) {
      warn(MISSING_API_KEY_FALLBACK_WARNING);
      return createMockLlmProvider();
    }
    throw error;
  }
}
