import type { BrainGraphSnapshot } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";

/** V3 parses transcripts; V2 conductor consumes resolved commands. */
export type IngestCommand = "ingest" | "skip" | "elaborate";

export type ConversationState =
  | "idle_chat"
  | "small_talk"
  | "briefing"
  | "ingest_decision"
  | "teaching";

export type OnboardingStep =
  | "intro"
  | "persona_voice"
  | "interests"
  | "first_star"
  | "done";

export interface OnboardingProgress {
  active: boolean;
  step: OnboardingStep;
  /** Count of interest-chat rounds during onboarding.interests */
  interestRounds: number;
}

export type ConversationEvent =
  | { type: "sessionStart" }
  | { type: "userSpeak"; transcript: string }
  | { type: "userInterrupt" }
  | { type: "newsAvailable"; queueLength: number }
  | { type: "ingestAnswer"; command: IngestCommand }
  | { type: "ingestReprompt" }
  | { type: "topicRequest"; topic: string; mode?: "single" | "walkthrough" };

export interface ConversationContext {
  newsQueue: NewsItem[];
  newsCursor: number;
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  personaId: string;
  recalledMemories?: string;
  onboarding: OnboardingProgress;
}

export interface Turn {
  say: string;
  expect?: "ingest" | "free";
  highlightNodeIds?: string[];
  nextState?: ConversationState;
}

export const DEFAULT_ONBOARDING: OnboardingProgress = {
  active: false,
  step: "done",
  interestRounds: 0,
};
