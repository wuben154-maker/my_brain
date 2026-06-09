import type { GraphMutationProposal } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";
import { ProviderConfigError } from "@/providers/providerConfigError";
import { MockLlmProvider } from "./mockLlmProvider";
import type { LlmTextResponse } from "./llmResponseShape";
import type {
  ConceptCandidate,
  LlmProvider,
  ResearchPlan,
} from "./types";

export interface DomesticLlmProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}

function requireDomesticApiKey(config: DomesticLlmProviderConfig): string {
  const apiKey = config.apiKey?.trim() ?? "";
  if (!apiKey) {
    throw new ProviderConfigError(
      "MISSING_API_KEY",
      "缺少国内 LLM API Key（请在 .env 设置 VITE_DOMESTIC_LLM_API_KEY，或将 VITE_LLM_PROVIDER 设为 mock）",
    );
  }
  return apiKey;
}

/** Domestic-named mock adapter — no live HTTP; demonstrates env + manifest contract. */
export class DomesticMockLlmProvider implements LlmProvider {
  readonly id = "domestic-mock-llm";

  private readonly delegate = new MockLlmProvider();
  private readonly apiKey: string;
  private readonly baseUrl?: string;

  constructor(config: DomesticLlmProviderConfig) {
    this.apiKey = requireDomesticApiKey(config);
    this.baseUrl = config.baseUrl?.trim() || undefined;
  }

  async complete(prompt: string): Promise<LlmTextResponse> {
    const trimmed = prompt.trim();
    const text =
      trimmed.length > 0
        ? `【国内 Mock】${trimmed}`
        : "【国内 Mock】已就绪，可继续讲解。";
    return {
      text,
      usage: {
        promptTokens: Math.max(1, Math.ceil(trimmed.length / 4)),
        completionTokens: Math.max(1, Math.ceil(text.length / 4)),
        totalTokens: Math.max(2, Math.ceil((trimmed.length + text.length) / 4)),
      },
    };
  }

  async summarize(sourceText: string): Promise<LlmTextResponse> {
    const trimmed = sourceText.trim();
    const text =
      trimmed.length > 0
        ? `【国内 Mock 摘要】${trimmed.slice(0, 180)}`
        : "【国内 Mock 摘要】暂无内容。";
    return {
      text,
      usage: {
        promptTokens: Math.max(1, Math.ceil(trimmed.length / 4)),
        completionTokens: Math.max(1, Math.ceil(text.length / 4)),
      },
    };
  }

  async summarizeNews(item: NewsItem, profile?: UserProfile): Promise<string> {
    const base = await this.delegate.summarizeNews(item, profile);
    return base.replace(/^AI 资讯：|^GitHub 趋势：/, (prefix) => `【国内 Mock】${prefix}`);
  }

  async explainConcept(topic: string, profile: UserProfile): Promise<string> {
    const completion = await this.complete(
      topic.trim() || "请讲解当前概念",
    );
    void profile;
    void this.baseUrl;
    void this.apiKey;
    return completion.text;
  }

  async proposeGraphMutations(context: string): Promise<GraphMutationProposal[]> {
    return this.delegate.proposeGraphMutations(context);
  }

  async distillUserProfile(
    transcript: string,
    current: UserProfile,
  ): Promise<UserProfile> {
    return this.delegate.distillUserProfile(transcript, current);
  }

  async planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan> {
    return this.delegate.planResearch(topic, profile);
  }

  async synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]> {
    return this.delegate.synthesizeConcepts(evidence);
  }
}

export function createDomesticLlmProvider(
  config: DomesticLlmProviderConfig,
): DomesticMockLlmProvider {
  return new DomesticMockLlmProvider(config);
}

/** Manifest-registered instance for parity harnesses (test key only). */
export const domesticMockLlmProvider = createDomesticLlmProvider({
  apiKey: "parity-test-key",
});
