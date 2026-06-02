import type { GraphMutationProposal } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { NewsItem } from "@/domain/news";
import type { LlmProvider, LlmProviderConfig } from "./types";

/** Stub LLM provider — business logic depends on the interface, not vendor SDKs. */
export class OpenAiLlmProvider implements LlmProvider {
  readonly id = "openai-chat";

  constructor(private readonly config: LlmProviderConfig) {
    void this.config;
  }

  async summarizeNews(item: NewsItem): Promise<string> {
    return `${item.title}（来源：${item.sourceName}）— 待接入大模型后生成通俗摘要。`;
  }

  async explainConcept(topic: string, profile: UserProfile): Promise<string> {
    const style = profile.explanationStyle ?? "通俗、中文讲解，保留英文术语";
    return `关于「${topic}」的讲解（${style}）将在 LLM 接入后生成。`;
  }

  async proposeGraphMutations(_context: string): Promise<GraphMutationProposal[]> {
    void _context;
    return [];
  }

  async distillUserProfile(
    _transcript: string,
    current: UserProfile,
  ): Promise<UserProfile> {
    void _transcript;
    return { ...current, updatedAt: new Date().toISOString() };
  }
}

export function createOpenAiLlmProvider(
  config: LlmProviderConfig,
): OpenAiLlmProvider {
  return new OpenAiLlmProvider(config);
}
