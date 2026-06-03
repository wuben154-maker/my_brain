import type { GraphMutationProposal } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { NewsItem } from "@/domain/news";
import {
  emptyResearchPlan,
  logResearchParseFailure,
  parseConceptCandidatesJson,
  parseResearchPlanJson,
} from "./researchStructuredOutput";
import type {
  ConceptCandidate,
  LlmProvider,
  LlmProviderConfig,
  ResearchPlan,
} from "./types";

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

  async planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan> {
    void profile;
    return this.parsePlanResponse("", topic.trim() || "未命名主题");
  }

  async synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]> {
    void evidence;
    return this.parseConceptsResponse("");
  }

  /** Shared parse path for structured API responses (B2); stub passes empty until wired. */
  parsePlanResponse(raw: string, fallbackTopic: string): ResearchPlan {
    const parsed = parseResearchPlanJson(raw);
    if (parsed) {
      return parsed;
    }
    if (raw.trim()) {
      logResearchParseFailure("planResearch", raw);
    }
    return emptyResearchPlan(fallbackTopic);
  }

  parseConceptsResponse(raw: string): ConceptCandidate[] {
    const parsed = parseConceptCandidatesJson(raw);
    if (parsed.length > 0 || !raw.trim()) {
      return parsed;
    }
    logResearchParseFailure("synthesizeConcepts", raw);
    return [];
  }
}

export function createOpenAiLlmProvider(
  config: LlmProviderConfig,
): OpenAiLlmProvider {
  return new OpenAiLlmProvider(config);
}
