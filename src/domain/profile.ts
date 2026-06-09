import type {
  ExplainPrefs,
  ProfileCorrection,
  ProfileCorrectionUndoSnapshot,
  ProfileInterest,
  UnderstandingLevel,
} from "@/domain/profile/userProfile";
import {
  DEFAULT_EXPLAIN_PREFS,
  DEFAULT_PROFILE_INTEREST_ENTRIES,
  DEFAULT_PROFILE_UNDERSTANDING,
} from "@/domain/profile/userProfile";

export type PersonaPreset = "mentor" | "companion" | "geek";

export interface UserProfile {
  displayName: string | null;
  companionName: string | null;
  persona: PersonaPreset;
  /** Legacy string interests from distillation — kept for V5 compatibility. */
  interests: string[];
  knownTopics: string[];
  unknownTopics: string[];
  explanationStyle: string | null;
  habits: string[];
  /** C3: per-topic multipliers for curation (1 = neutral). */
  topicWeights?: Record<string, number>;
  /** C2: structured interests with weights for briefing rerank. */
  interestEntries?: ProfileInterest[];
  /** C2: per-concept understanding level for teaching depth. */
  understanding?: Record<string, UnderstandingLevel>;
  /** C2: explanation style preferences. */
  explainPrefs?: ExplainPrefs;
  /** C2: fields user explicitly corrected — distillation must not overwrite. */
  correctedFields?: string[];
  updatedAt: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  displayName: null,
  companionName: null,
  persona: "mentor",
  interests: [],
  knownTopics: [],
  unknownTopics: [],
  explanationStyle: null,
  habits: [],
  interestEntries: DEFAULT_PROFILE_INTEREST_ENTRIES.map((entry) => ({ ...entry })),
  understanding: { ...DEFAULT_PROFILE_UNDERSTANDING },
  explainPrefs: { ...DEFAULT_EXPLAIN_PREFS },
  correctedFields: [],
  updatedAt: new Date(0).toISOString(),
};

export type {
  ExplainPrefs,
  ProfileCorrection,
  ProfileCorrectionUndoSnapshot,
  ProfileInterest,
  UnderstandingLevel,
};
