import { mockStructuredJsonValue, parseStructuredJsonResponse } from "./structuredJsonParse.js";
import type {
  LlmProvider,
  NewsSource,
  ProviderBundle,
  VoiceConnectionState,
  VoiceProvider,
} from "./types.js";

export function createMockVoiceProvider(id = "mock-voice"): VoiceProvider {
  let state: VoiceConnectionState = "idle";
  return {
    id,
    async connect() {
      state = "listening";
    },
    async disconnect() {
      state = "idle";
    },
    async interrupt() {
      state = "listening";
    },
    getState() {
      return state;
    },
  };
}

export function createMockLlmProvider(id = "mock-llm"): LlmProvider {
  return {
    id,
    async summarize(text: string) {
      return `mock-summary:${text.slice(0, 48)}`;
    },
    async explain(topic: string, context?: string) {
      const contextSuffix = context ? `:context=${context.slice(0, 32)}` : "";
      return `mock-explain:${topic.slice(0, 48)}${contextSuffix}`;
    },
    async generateStructuredJson(request) {
      const raw = JSON.stringify(mockStructuredJsonValue(request.prompt));
      return parseStructuredJsonResponse(raw, request);
    },
    async testConnection() {
      return {
        status: "degraded",
        errorCode: "MISSING_API_KEY",
        message: "Mock LLM — no live connection",
      };
    },
  };
}

export function createMockNewsSource(id = "mock-news"): NewsSource {
  return {
    id,
    async fetchHeadlines() {
      return [{ id: "fixture-1", title: "Mock headline" }];
    },
  };
}

export function createMockProviderBundle(): ProviderBundle {
  return {
    voice: createMockVoiceProvider(),
    llm: createMockLlmProvider(),
    news: createMockNewsSource(),
    modes: {
      voice: "mock",
      llm: "mock",
      newsRadar: "mock",
    },
  };
}
