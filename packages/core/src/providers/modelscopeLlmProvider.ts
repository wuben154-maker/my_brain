import {
  createOpenAiCompatibleLlmProvider,
  type OpenAiCompatibleLlmProviderConfig,
} from "./openAiCompatibleLlmProvider.js";
import type { LlmProvider } from "./types.js";

export const DEFAULT_MODELSCOPE_BASE_URL =
  "https://api-inference.modelscope.cn/v1";

export const DEFAULT_MODELSCOPE_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507";

export interface ModelScopeLlmProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetch: OpenAiCompatibleLlmProviderConfig["fetch"];
}

/** ModelScope OpenAI-compatible LLM provider for COMPANION live gates. */
export function createModelScopeLlmProvider(
  config: ModelScopeLlmProviderConfig,
): LlmProvider {
  return createOpenAiCompatibleLlmProvider({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl?.trim() || DEFAULT_MODELSCOPE_BASE_URL,
    model: config.model?.trim() || DEFAULT_MODELSCOPE_MODEL,
    fetch: config.fetch,
  });
}
