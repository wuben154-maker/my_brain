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

export type OpenAiLlmErrorCode = "missing_api_key" | "not_implemented";

/** Structured failure for OpenAI LLM paths — never masquerade as empty success. */
export class OpenAiLlmError extends Error {
  readonly code: OpenAiLlmErrorCode;

  constructor(code: OpenAiLlmErrorCode, message: string) {
    super(message);
    this.name = "OpenAiLlmError";
    this.code = code;
  }
}

export function hasOpenAiLlmApiKey(config: LlmProviderConfig): boolean {
  return Boolean(config.apiKey.trim());
}

function requireOpenAiLlmReady(config: LlmProviderConfig): never {
  if (!hasOpenAiLlmApiKey(config)) {
    throw new OpenAiLlmError(
      "missing_api_key",
      "缺少 OpenAI API Key（请在 .env 设置 VITE_OPENAI_API_KEY，或将 VITE_LLM_PROVIDER 设为 mock）",
    );
  }
  throw new OpenAiLlmError(
    "not_implemented",
    "OpenAI LLM 入库/研究接口尚未接入；请将 VITE_LLM_PROVIDER=mock 用于本地开发",
  );
}

/** OpenAI LLM provider — no silent empty stubs for ingest/research. */
export class OpenAiLlmProvider implements LlmProvider {
  readonly id = "openai-chat";

  constructor(private readonly config: LlmProviderConfig) {}

  async summarizeNews(item: NewsItem, profile?: UserProfile): Promise<string> {
    void item;
    void profile;
    requireOpenAiLlmReady(this.config);
  }

  async explainConcept(topic: string, profile: UserProfile): Promise<string> {
    void topic;
    void profile;
    requireOpenAiLlmReady(this.config);
  }

  async proposeGraphMutations(context: string): Promise<GraphMutationProposal[]> {
    void context;
    requireOpenAiLlmReady(this.config);
  }

  async distillUserProfile(
    transcript: string,
    current: UserProfile,
  ): Promise<UserProfile> {
    void transcript;
    void current;
    requireOpenAiLlmReady(this.config);
  }

  async planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan> {
    void topic;
    void profile;
    requireOpenAiLlmReady(this.config);
  }

  async synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]> {
    const snippets = evidence.map((line) => line.trim()).filter(Boolean);
    if (snippets.length === 0) {
      return [];
    }
    requireOpenAiLlmReady(this.config);
  }

  /** Shared parse path for structured API responses (B2). */
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
