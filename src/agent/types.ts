import type { GraphMutationProposal, BrainGraphSnapshot } from "../domain/graph";
import type { UserProfile } from "../domain/profile";
import type { NewsItem } from "../domain/news";
import type {
  ConceptCandidate,
  ResearchPlan,
} from "../providers/llm/types";

/** Where a proposal originated — inbox routing + analytics. */
export type ProposalSource =
  | "voice"
  | "background_ingest"
  | "research_loop"
  | "profile_suggestion";

export type ProposalStatus = "pending" | "approved" | "rejected" | "expired";

/** Persisted inbox row shape (A2); runner only produces pending envelopes. */
export interface ProposalEnvelope {
  id: string;
  runId: string;
  createdAt: string;
  source: ProposalSource;
  status: ProposalStatus;
  proposal: GraphMutationProposal;
}

export interface AgentDigestSection {
  headline: string;
  body: string;
}

/** Ephemeral briefing text — not stored as raw articles. */
export interface AgentDigest {
  title: string;
  sections: AgentDigestSection[];
  generatedAt: string;
}

export interface AgentTraceStep {
  stepId: string;
  name: string;
  startedAt: string;
  finishedAt: string;
  inputSummary?: string;
  outputSummary?: string;
  tokensUsed?: number;
  error?: string;
}

/**
 * Atomic capabilities for one agent run — all via existing providers.
 * Intentionally read-only for graph/profile: no write methods on this interface.
 */
export interface AgentTools {
  fetchNews(): Promise<NewsItem[]>;
  summarize(item: NewsItem, profile?: UserProfile): Promise<string>;
  explain(topic: string, profile: UserProfile): Promise<string>;
  propose(context: string): Promise<GraphMutationProposal[]>;
  planResearch(topic: string, profile: UserProfile): Promise<ResearchPlan>;
  synthesizeConcepts(evidence: string[]): Promise<ConceptCandidate[]>;
  readGraph(): Promise<BrainGraphSnapshot>;
  readProfile(): Promise<UserProfile>;
}

/** Output of a single autonomous run — proposals only, never direct graph writes. */
export interface AgentRunResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  proposals: ProposalEnvelope[];
  digest: AgentDigest | null;
  trace: AgentTraceStep[];
}

/** Schedulable unit of autonomous work. */
export interface AgentJob {
  readonly id: string;
  run(tools: AgentTools, signal: AbortSignal): Promise<AgentRunResult>;
}

type ForbiddenAgentToolMethod =
  | "saveConcept"
  | "saveEdge"
  | "deleteEdge"
  | "saveUserProfile"
  | "saveProposal"
  | "persistGraph"
  | "init"
  | "close";

/** Compile-time guard: AgentTools must not expose storage write handles. */
export type AssertAgentToolsReadOnly =
  Extract<ForbiddenAgentToolMethod, keyof AgentTools> extends never ? true : false;

export const AGENT_TOOLS_READ_ONLY: AssertAgentToolsReadOnly = true;
