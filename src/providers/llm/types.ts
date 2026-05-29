import type { GraphMutationProposal } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { NewsItem } from "@/domain/news";

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
  distillUserProfile(transcript: string, current: UserProfile): Promise<UserProfile>;
}
