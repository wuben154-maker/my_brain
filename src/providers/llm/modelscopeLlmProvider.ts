import type { GraphMutationProposal } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";
import { stylizeExplanation } from "@/lib/personaPrompt";
import { ProviderConfigError } from "@/providers/providerConfigError";
import { createOpenAiCompatibleCompletion } from "./openaiCompatibleClient";
import {
  emptyResearchPlan,
  logResearchParseFailure,
  parseConceptCandidatesJson,
  parseResearchPlanJson,
} from "./researchStructuredOutput";
import type {
  ConceptCandidate,
  LlmProvider,
  ResearchPlan,
} from "./types";

export interface ModelScopeLlmProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export const DEFAULT_MODELSCOPE_BASE_URL =
  "https://api-inference.modelscope.cn/v1";

export const DEFAULT_MODELSCOPE_MODEL = "Qwen/Qwen2.5-7B-Instruct";

function requireModelScopeApiKey(config: ModelScopeLlmProviderConfig): string {
  const apiKey = config.apiKey?.trim() ?? "";
  if (!apiKey) {
    throw new ProviderConfigError(
      "MISSING_API_KEY",
      "缺少 ModelScope API Key（请在 .env 设置 VITE_MODELSCOPE_API_KEY，或将 VITE_LLM_PROVIDER 设为 mock）",
    );
  }
  return apiKey;
}

/** ModelScope OpenAI-compatible LLM provider for non-realtime tasks. */
export class ModelScopeLlmProvider implements LlmProvider {
  readonly id = "modelscope-chat";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: ModelScopeLlmProviderConfig) {
    this.apiKey = requireModelScopeApiKey(config);
    this.baseUrl = config.baseUrl?.trim() || DEFAULT_MODELSCOPE_BASE_URL;
    this.model = config.model?.trim() || DEFAULT_MODELSCOPE_MODEL;
  }

  private async complete(prompt: string, system?: string): Promise<string> {
    const response = await createOpenAiCompatibleCompletion({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            system ??
            "你是 my_brain 的非实时文本助手。用中文回答，保留英文技术术语。",
        },
        { role: "user", content: prompt },
      ],
    });
    return response.text;
  }

  async summarizeNews(item: NewsItem, profile?: UserProfile): Promise<string> {
    const personaHint = profile
      ? `用户画像：${profile.interests.slice(0, 5).join("、") || "通用 AI 兴趣"}`
      : "通用 AI 兴趣";
    const raw = await this.complete(
      [
        personaHint,
        `资讯标题：${item.title}`,
        `摘要：${item.summary}`,
        "请用 2-4 句口语化中文讲解这条资讯，保留英文技术词。",
      ].join("\n"),
    );
    return profile
      ? stylizeExplanation(profile, raw, { topicHint: item.title })
      : raw;
  }

  async explainConcept(topic: string, profile: UserProfile): Promise<string> {
    const raw = await this.complete(
      [
        `用户画像：${profile.interests.slice(0, 5).join("、") || "通用 AI 兴趣"}`,
        `请解释概念：${topic}`,
        "控制在 4-6 句，保留英文技术词。",
      ].join("\n"),
    );
    return stylizeExplanation(profile, raw, { topicHint: topic });
  }

  async proposeGraphMutations(context: string): Promise<GraphMutationProposal[]> {
    void context;
    return [];
  }

  async distillUserProfile(
    transcript: string,
    current: UserProfile,
  ): Promise<UserProfile> {
    void transcript;
    return current;
  }

  async planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan> {
    const raw = await this.complete(
      [
        `研究主题：${topic}`,
        `用户兴趣：${profile.interests.join("、") || "AI"}`,
        '返回 JSON：{"topic":"","subQuestions":[],"suggestedSources":[]}',
      ].join("\n"),
      "只输出 JSON，不要 markdown。",
    );
    const parsed = parseResearchPlanJson(raw);
    if (parsed) {
      return parsed;
    }
    logResearchParseFailure("planResearch", raw);
    return emptyResearchPlan(topic);
  }

  async synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]> {
    const snippets = evidence.map((line) => line.trim()).filter(Boolean);
    if (snippets.length === 0) {
      return [];
    }
    const raw = await this.complete(
      [
        "根据以下证据提炼 1-3 个概念候选。",
        snippets.join("\n---\n"),
        '返回 JSON 数组：[{"title":"","intro":"","sourceUrl":null,"relations":[]}]',
      ].join("\n"),
      "只输出 JSON 数组，不要 markdown。",
    );
    const parsed = parseConceptCandidatesJson(raw);
    if (parsed.length > 0 || !raw.trim()) {
      return parsed;
    }
    logResearchParseFailure("synthesizeConcepts", raw);
    return [];
  }
}

export function createModelScopeLlmProvider(
  config: ModelScopeLlmProviderConfig,
): ModelScopeLlmProvider {
  return new ModelScopeLlmProvider(config);
}
