import {
  connectionStatusFromErrorCode,
  LlmProviderError,
} from "./llmErrors.js";
import {
  createOpenAiCompatibleCompletion,
  hasLlmApiKey,
  type LlmFetch,
  type OpenAiCompatibleClientConfig,
} from "./openAiCompatibleClient.js";
import {
  parseStructuredJsonResponse,
} from "./structuredJsonParse.js";
import type {
  LlmConnectionTestResult,
  LlmProvider,
  LlmStructuredJsonRequest,
  LlmStructuredJsonResult,
} from "./types.js";

export const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

export interface OpenAiCompatibleLlmProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetch: LlmFetch;
}

export class OpenAiCompatibleLlmProvider implements LlmProvider {
  readonly id = "openai-compatible-llm";
  private readonly clientConfig: OpenAiCompatibleClientConfig;

  constructor(config: OpenAiCompatibleLlmProviderConfig) {
    this.clientConfig = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? DEFAULT_DEEPSEEK_BASE_URL,
      model: config.model ?? DEFAULT_DEEPSEEK_MODEL,
      fetch: config.fetch,
    };
  }

  async summarize(text: string): Promise<string> {
    const result = await createOpenAiCompatibleCompletion(this.clientConfig, [
      {
        role: "system",
        content: "Summarize the following text in concise Chinese. Keep technical terms accurate.",
      },
      { role: "user", content: text },
    ]);
    return result.text;
  }

  async explain(topic: string, context?: string): Promise<string> {
    const userContent = context
      ? `Topic: ${topic}\n\nContext:\n${context}`
      : topic;
    const result = await createOpenAiCompatibleCompletion(this.clientConfig, [
      {
        role: "system",
        content:
          "Explain the topic in clear Chinese for a technical learner. Keep English technical terms where useful.",
      },
      { role: "user", content: userContent },
    ]);
    return result.text;
  }

  async generateStructuredJson<T>(
    request: LlmStructuredJsonRequest<T>,
  ): Promise<LlmStructuredJsonResult<T>> {
    const schemaHint = request.schemaHint?.trim();
    const systemPrompt = schemaHint
      ? `Return only valid JSON that matches this schema hint:\n${schemaHint}`
      : "Return only valid JSON with no markdown or commentary.";

    try {
      const result = await createOpenAiCompatibleCompletion(this.clientConfig, [
        { role: "system", content: systemPrompt },
        { role: "user", content: request.prompt },
      ]);
      return parseStructuredJsonResponse(result.text, request);
    } catch (error) {
      if (error instanceof LlmProviderError) {
        return {
          ok: false,
          errorCode: error.code,
          message: error.message,
        };
      }
      return {
        ok: false,
        errorCode: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Structured LLM request failed",
      };
    }
  }

  async testConnection(): Promise<LlmConnectionTestResult> {
    if (!hasLlmApiKey(this.clientConfig.apiKey)) {
      return {
        status: "error",
        errorCode: "MISSING_API_KEY",
        message: "LLM API key is missing",
      };
    }

    try {
      await createOpenAiCompatibleCompletion(
        this.clientConfig,
        [{ role: "user", content: "ping" }],
        { maxTokens: 8, temperature: 0 },
      );
      return { status: "connected" };
    } catch (error) {
      if (error instanceof LlmProviderError) {
        return {
          status: connectionStatusFromErrorCode(error.code),
          errorCode: error.code,
          message: error.message,
        };
      }
      return {
        status: "error",
        errorCode: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "LLM connection test failed",
      };
    }
  }
}

export function createOpenAiCompatibleLlmProvider(
  config: OpenAiCompatibleLlmProviderConfig,
): LlmProvider {
  return new OpenAiCompatibleLlmProvider(config);
}

export function createDeepSeekLlmProvider(
  config: OpenAiCompatibleLlmProviderConfig,
): LlmProvider {
  return createOpenAiCompatibleLlmProvider({
    ...config,
    baseUrl: config.baseUrl ?? DEFAULT_DEEPSEEK_BASE_URL,
    model: config.model ?? DEFAULT_DEEPSEEK_MODEL,
  });
}

export { hasLlmApiKey };
