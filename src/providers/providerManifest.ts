import { createDomesticLlmProvider, domesticMockLlmProvider } from "./llm/domesticMockLlmProvider";
import type { LlmProvider } from "./llm/types";
import { createMockLlmProvider } from "./llm/mockLlmProvider";
import { createMockMemoryProvider } from "./memory/mockMemoryProvider";
import type { MemoryProvider } from "./memory/types";
import { createNewsSourceRegistry } from "./news/types";
import type { NewsSourceRegistry } from "./news/types";
import { MockVoiceProvider } from "./voice/mockVoiceProvider";
import type { VoiceProvider } from "./voice/types";
import { fixtureWorldSource } from "@/radar/worldSources/fixtureWorldSource";

export type ProviderKind = "voice" | "llm" | "news" | "memory";

export interface ProviderPluginManifest {
  id: string;
  kind: ProviderKind;
  envKeys: string[];
  mockImpl: () => VoiceProvider | LlmProvider | NewsSourceRegistry | MemoryProvider;
  liveImpl?: () => VoiceProvider | LlmProvider | NewsSourceRegistry | MemoryProvider;
  docs?: string;
}

export const PROVIDER_PLUGIN_CONTRACT_DOC =
  "docs/providers/PROVIDER_PLUGIN_CONTRACT.md";

export const PROVIDER_PLUGIN_REGISTRY: readonly ProviderPluginManifest[] = [
  {
    id: "mock-voice",
    kind: "voice",
    envKeys: ["VITE_OPENAI_API_KEY"],
    mockImpl: () => new MockVoiceProvider(),
    docs: `${PROVIDER_PLUGIN_CONTRACT_DOC}#voice-provider`,
  },
  {
    id: "mock-llm",
    kind: "llm",
    envKeys: [],
    mockImpl: () => createMockLlmProvider(),
    docs: `${PROVIDER_PLUGIN_CONTRACT_DOC}#llm-provider`,
  },
  {
    id: "domestic-mock-llm",
    kind: "llm",
    envKeys: ["DOMESTIC_LLM_API_KEY", "DOMESTIC_LLM_BASE_URL"],
    mockImpl: () => domesticMockLlmProvider,
    liveImpl: () =>
      createDomesticLlmProvider({
        apiKey: import.meta.env.VITE_DOMESTIC_LLM_API_KEY,
        baseUrl: import.meta.env.VITE_DOMESTIC_LLM_BASE_URL,
      }),
    docs: `${PROVIDER_PLUGIN_CONTRACT_DOC}#domestic-mock`,
  },
  {
    id: "fixture-world-source",
    kind: "news",
    envKeys: [],
    mockImpl: () =>
      createNewsSourceRegistry([
        {
          id: fixtureWorldSource.id,
          label: fixtureWorldSource.label,
          fetchLatest: async () => ({
            sourceId: fixtureWorldSource.id,
            sourceLabel: fixtureWorldSource.label,
            fetchedAt: new Date(0).toISOString(),
            items: (await fixtureWorldSource.fetchWorldItems()).map((item) => ({
              id: item.id,
              category:
                item.kind === "github_trending" ? "github_trending" : "ai_news",
              title: item.title,
              summary: item.summary,
              sourceName: item.sourceName ?? fixtureWorldSource.label,
              sourceUrl: item.sourceUrl ?? "",
              publishedAt: item.fetchedAt,
            })),
          }),
        },
      ]),
    docs: `${PROVIDER_PLUGIN_CONTRACT_DOC}#news-source`,
  },
  {
    id: "mock-memory",
    kind: "memory",
    envKeys: [],
    mockImpl: () => createMockMemoryProvider(),
    docs: `${PROVIDER_PLUGIN_CONTRACT_DOC}#memory-provider`,
  },
] as const;

export function getProviderManifest(id: string): ProviderPluginManifest | undefined {
  return PROVIDER_PLUGIN_REGISTRY.find((entry) => entry.id === id);
}

export function listProviderManifests(kind?: ProviderKind): ProviderPluginManifest[] {
  if (!kind) {
    return [...PROVIDER_PLUGIN_REGISTRY];
  }
  return PROVIDER_PLUGIN_REGISTRY.filter((entry) => entry.kind === kind);
}
