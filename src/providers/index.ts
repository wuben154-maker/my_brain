import { OpenAiRealtimeVoiceProvider } from "./voice/openaiRealtimeVoiceProvider";

import { MockVoiceProvider } from "./voice/mockVoiceProvider";

import { VolcengineRealtimeVoiceProvider } from "./voice/volcengineRealtimeVoiceProvider";

import { ArxivNewsSource } from "./news/arxivNewsSource";

import { GitHubTrendingNewsSource } from "./news/githubTrendingSource";

import { RssNewsSource } from "./news/rssNewsSource";

import {

  createNewsSourceRegistry,

  type NewsSourceRegistry,

} from "./news/types";

import type { LlmProvider } from "./llm/types";

import type { VoiceProvider } from "./voice/types";

import { readVoiceProviderMode } from "@/lib/voiceProviderMode";

import {

  createMemoryProvider,

  createMockMemoryProvider,

  type MemoryProvider,

} from "./memory";

import { resolveLlmProviderWithFallback } from "./providerConfigRecovery";

import type { CreateAppProvidersOptions, ProviderEnv } from "./providerTypes";



export type { ProviderEnv, CreateAppProvidersOptions } from "./providerTypes";



export interface AppProviders {

  voice: VoiceProvider;

  llm: LlmProvider;

  news: NewsSourceRegistry;

  memory: MemoryProvider;

}



export function createVoiceProvider(options: CreateAppProvidersOptions = {}): VoiceProvider {
  if (options.forceMock) {
    return new MockVoiceProvider();
  }

  const mode = readVoiceProviderMode();
  if (mode === "openai-realtime") {
    return new OpenAiRealtimeVoiceProvider();
  }
  if (mode === "volc-realtime") {
    return new VolcengineRealtimeVoiceProvider();
  }
  return new MockVoiceProvider();
}



export function createLlmProvider(

  env: ProviderEnv,

  options: CreateAppProvidersOptions = {},

): LlmProvider {

  return resolveLlmProviderWithFallback(env, options);

}



export function createAppProviders(

  env: ProviderEnv,

  options: CreateAppProvidersOptions = {},

): AppProviders {

  if (options.forceMock) {

    return {

      voice: createVoiceProvider(options),

      llm: createLlmProvider(env, options),

      news: createNewsSourceRegistry([]),

      memory: createMockMemoryProvider(),

    };

  }

  return {

    voice: createVoiceProvider(),

    llm: createLlmProvider(env),

    news: createNewsSourceRegistry([

      new RssNewsSource(),

      new GitHubTrendingNewsSource(),

      new ArxivNewsSource(),

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

export {

  DomesticMockLlmProvider,

  createDomesticLlmProvider,

  domesticMockLlmProvider,

} from "./llm/domesticMockLlmProvider";

export {

  ModelScopeLlmProvider,

  createModelScopeLlmProvider,

  DEFAULT_MODELSCOPE_BASE_URL,

  DEFAULT_MODELSCOPE_MODEL,

} from "./llm/modelscopeLlmProvider";

export {

  VolcengineRealtimeVoiceProvider,

  createVolcengineRealtimeVoiceProvider,

} from "./voice/volcengineRealtimeVoiceProvider";

export {

  ProviderConfigError,

  isMissingApiKeyError,

  isProviderConfigError,

} from "./providerConfigError";

export {

  createConfiguredLlmProvider,

  resolveLlmProviderWithFallback,

  MISSING_API_KEY_FALLBACK_WARNING,

  MODELSCOPE_MISSING_KEY_FALLBACK_WARNING,

} from "./providerConfigRecovery";

export {

  PROVIDER_PLUGIN_REGISTRY,

  getProviderManifest,

  listProviderManifests,

  type ProviderPluginManifest,

  type ProviderKind,

} from "./providerManifest";

export type {

  VoiceProvider,

  VoiceTimbre,

  VoiceSpeakProgressEvent,

} from "./voice/types";

export type { LlmProvider } from "./llm/types";

export type { NewsSource, NewsSourceRegistry } from "./news/types";

export type {

  MemoryProvider,

  MemoryItem,

  RecallQuery,

  RecalledMemory,

} from "./memory";

