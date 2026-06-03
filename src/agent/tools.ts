import type { BrainGraphSnapshot } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { LlmProvider } from "@/providers/llm/types";
import {
  flattenNewsItems,
  type NewsSourceRegistry,
} from "@/providers/news/types";
import type { AgentTools } from "./types";

/** Read-only storage slice — runner must never receive write methods. */
export type AgentReadStorage = {
  loadGraph(): Promise<BrainGraphSnapshot>;
  loadUserProfile(): Promise<UserProfile>;
};

export interface CreateAgentToolsInput {
  llm: LlmProvider;
  news: NewsSourceRegistry;
  readGraph: () => Promise<BrainGraphSnapshot>;
  readProfile: () => Promise<UserProfile>;
}

/** Wire AgentTools from existing providers; all graph mutations stay off-tools. */
export function createAgentTools(input: CreateAgentToolsInput): AgentTools {
  const { llm, news, readGraph, readProfile } = input;
  return {
    async fetchNews() {
      const results = await news.fetchAll();
      return flattenNewsItems(results);
    },
    summarize(item, profile) {
      return llm.summarizeNews(item, profile);
    },
    explain(topic, profile) {
      return llm.explainConcept(topic, profile);
    },
    propose(context) {
      return llm.proposeGraphMutations(context);
    },
    planResearch(topic, profile) {
      return llm.planResearch(topic, profile);
    },
    synthesizeConcepts(evidence) {
      return llm.synthesizeConcepts(evidence);
    },
    readGraph() {
      return readGraph();
    },
    readProfile() {
      return readProfile();
    },
  };
}

export function createAgentToolsFromProviders(
  llm: LlmProvider,
  news: NewsSourceRegistry,
  storage: AgentReadStorage,
): AgentTools {
  return createAgentTools({
    llm,
    news,
    readGraph: () => storage.loadGraph(),
    readProfile: () => storage.loadUserProfile(),
  });
}

/** Runtime check for invariant tests — AgentTools surface has no write methods. */
export const AGENT_TOOL_WRITE_METHODS = [
  "saveConcept",
  "saveEdge",
  "deleteEdge",
  "saveUserProfile",
  "saveProposal",
  "persistGraph",
  "init",
  "close",
] as const;

export function assertAgentToolsReadOnly(tools: AgentTools): void {
  for (const key of AGENT_TOOL_WRITE_METHODS) {
    if (key in (tools as unknown as Record<string, unknown>)) {
      throw new Error(`AgentTools must not expose write method: ${key}`);
    }
  }
}
