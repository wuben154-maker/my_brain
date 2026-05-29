import { OpenAiRealtimeVoiceProvider } from "./voice/openaiRealtimeVoiceProvider";
import { createOpenAiLlmProvider } from "./llm/openaiLlmProvider";
import { GitHubTrendingNewsSource } from "./news/githubTrendingSource";
import { RssNewsSource } from "./news/rssNewsSource";
import {
  createNewsSourceRegistry,
  type NewsSourceRegistry,
} from "./news/types";
import type { LlmProvider } from "./llm/types";
import type { VoiceProvider } from "./voice/types";

export interface AppProviders {
  voice: VoiceProvider;
  llm: LlmProvider;
  news: NewsSourceRegistry;
}

export interface ProviderEnv {
  openAiApiKey: string;
  openAiLlmModel?: string;
  openAiRealtimeModel?: string;
}

export function createAppProviders(env: ProviderEnv): AppProviders {
  return {
    voice: new OpenAiRealtimeVoiceProvider(),
    llm: createOpenAiLlmProvider({
      apiKey: env.openAiApiKey,
      model: env.openAiLlmModel,
    }),
    news: createNewsSourceRegistry([
      new RssNewsSource(),
      new GitHubTrendingNewsSource(),
    ]),
  };
}

export type { VoiceProvider } from "./voice/types";
export type { LlmProvider } from "./llm/types";
export type { NewsSource, NewsSourceRegistry } from "./news/types";
