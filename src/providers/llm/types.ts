import type { RelationType } from "@/domain/graph";
import type { GraphMutationProposal } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";

export interface ResearchPlan {
  topic: string;
  subQuestions: string[];
  suggestedSources: string[];
}

export interface ConceptCandidate {
  title: string;
  intro: string;
  sourceUrl: string | null;
  relations: Array<{ targetTitle: string; relationType: RelationType }>;
}

export interface LlmCompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProviderConfig {
  apiKey: string;
  model?: string;
}

export interface LlmProvider {
  readonly id: string;
  summarizeNews(item: NewsItem): Promise<string>;
  explainConcept(topic: string, profile: UserProfile): Promise<string>;
  proposeGraphMutations(context: string): Promise<GraphMutationProposal[]>;
  distillUserProfile(
    transcript: string,
    current: UserProfile,
  ): Promise<UserProfile>;
  planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan>;
  synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]>;
}
