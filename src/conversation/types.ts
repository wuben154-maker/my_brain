import type { InterviewQuestion } from "@/domain/actions/interviewQuestion";
import type { BrainGraphSnapshot } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";
import type { BriefingFeedback } from "@/domain/radar/briefingItem";
import type { RadarSignal } from "@/domain/radar/radarSignal";

/** V3 parses transcripts; V2 conductor consumes resolved commands. */
export type IngestCommand = "ingest" | "skip" | "elaborate";

export type ConversationState =
  | "idle_chat"
  | "small_talk"
  | "briefing"
  | "ingest_decision"
  | "teaching"
  | "interview";

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
  | { type: "ingestReprompt"; reason?: string }
  | { type: "topicRequest"; topic: string; mode?: "single" | "walkthrough" }
  | { type: "interviewStart" }
  | { type: "interviewSkip" }
  | { type: "interviewNext" };

export interface InterviewSessionContext {
  questions: InterviewQuestion[];
  cursor: number;
}

export interface ConversationContext {
  newsQueue: NewsItem[];
  newsCursor: number;
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  personaId: string;
  recalledMemories?: string;
  /** Formatted profile + subgraph digest for LLM context injection. */
  graphContextDigest?: string;
  onboarding: OnboardingProgress;
  /** KOS-C3: in-flight interview pack cursor (session-only, no persist). */
  interviewSession?: InterviewSessionContext;
  /** KP-05: briefing feedback + signals for elaboration depth resolution. */
  briefingFeedbackByItemId?: Record<string, BriefingFeedback[]>;
  briefingSignalsByItemId?: Record<string, RadarSignal[]>;
  topicKeyByItemId?: Record<string, string>;
}

export interface Turn {
  say: string;
  expect?: "ingest" | "free";
  highlightNodeIds?: string[];
  nextState?: ConversationState;
  /** KOS-C3: interview session lifecycle for store sync (no graph writes). */
  interviewAction?: "start" | "skip" | "next";
  interviewQuestions?: InterviewQuestion[];
}

export const DEFAULT_ONBOARDING: OnboardingProgress = {
  active: false,
  step: "done",
  interestRounds: 0,
};
