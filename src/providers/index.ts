import { OpenAiRealtimeVoiceProvider } from "./voice/openaiRealtimeVoiceProvider";
import { MockVoiceProvider } from "./voice/mockVoiceProvider";
import { createOpenAiLlmProvider } from "./llm/openaiLlmProvider";
import { createMockLlmProvider } from "./llm/mockLlmProvider";
import { GitHubTrendingNewsSource } from "./news/githubTrendingSource";
import { RssNewsSource } from "./news/rssNewsSource";
import {
  createNewsSourceRegistry,
  type NewsSourceRegistry,
} from "./news/types";
import type { LlmProvider } from "./llm/types";
import type { VoiceProvider } from "./voice/types";
import { readVoiceProviderMode } from "@/lib/voiceProviderMode";
import { readLlmProviderMode } from "@/lib/llmProviderMode";
import {
  createMemoryProvider,
  type MemoryProvider,
} from "./memory";

export interface AppProviders {
  voice: VoiceProvider;
  llm: LlmProvider;
  news: NewsSourceRegistry;
  memory: MemoryProvider;
}

export interface ProviderEnv {
  openAiApiKey: string;
  openAiLlmModel?: string;
  openAiRealtimeModel?: string;
  everMemOsBaseUrl?: string;
  everMemOsApiKey?: string;
  everMemOsUserId?: string;
}

export function createVoiceProvider(): VoiceProvider {
  return readVoiceProviderMode() === "openai-realtime"
    ? new OpenAiRealtimeVoiceProvider()
    : new MockVoiceProvider();
}

export function createLlmProvider(env: ProviderEnv): LlmProvider {
  return readLlmProviderMode() === "openai"
    ? createOpenAiLlmProvider({
        apiKey: env.openAiApiKey,
        model: env.openAiLlmModel,
      })
    : createMockLlmProvider();
}

export function createAppProviders(env: ProviderEnv): AppProviders {
  return {
    voice: createVoiceProvider(),
    llm: createLlmProvider(env),
    news: createNewsSourceRegistry([
      new RssNewsSource(),
      new GitHubTrendingNewsSource(),
    ]),
    memory: createMemoryProvider({
      everMemOsBaseUrl: env.everMemOsBaseUrl,
      everMemOsApiKey: env.everMemOsApiKey,
      everMemOsUserId: env.everMemOsUserId,
    }),
  };
}

export { isMockVoiceProvider, MockVoiceProvider } from "./voice/mockVoiceProvider";
export { MockLlmProvider, createMockLlmProvider } from "./llm/mockLlmProvider";
export type { VoiceProvider } from "./voice/types";
export type { LlmProvider } from "./llm/types";
export type { NewsSource, NewsSourceRegistry } from "./news/types";
export type {
  MemoryProvider,
  MemoryItem,
  RecallQuery,
  RecalledMemory,
} from "./memory";
