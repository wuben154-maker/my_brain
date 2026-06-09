import { OpenAiRealtimeVoiceProvider } from "./voice/openaiRealtimeVoiceProvider";

import { MockVoiceProvider } from "./voice/mockVoiceProvider";

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

  return !options.forceMock && readVoiceProviderMode() === "openai-realtime"

    ? new OpenAiRealtimeVoiceProvider()

    : new MockVoiceProvider();

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

  ProviderConfigError,

  isMissingApiKeyError,

  isProviderConfigError,

} from "./providerConfigError";

export {

  createConfiguredLlmProvider,

  resolveLlmProviderWithFallback,

  MISSING_API_KEY_FALLBACK_WARNING,

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

