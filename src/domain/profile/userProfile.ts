export type UnderstandingLevel = "unfamiliar" | "heard" | "can_explain";

export interface ProfileInterest {
  id: string;
  label: string;
  weight: number;
}

export interface ExplainPrefs {
  preferMetaphor: boolean;
  preferSourceCode: boolean;
  preferArchitecture: boolean;
  preferInterview: boolean;
}

export interface ProfileCorrection {
  field: string;
  previousValue: unknown;
  nextValue: unknown;
  correctionAt: string;
}

export interface ProfileCorrectionUndoSnapshot {
  profile: UserProfileSnapshot;
  corrections: ProfileCorrection[];
  correctedFields: string[];
}

/** Serializable profile slice for undo — mirrors persisted UserProfile fields. */
export interface UserProfileSnapshot {
  displayName: string | null;
  companionName: string | null;
  persona: import("@/domain/profile").PersonaPreset;
  interests: string[];
  knownTopics: string[];
  unknownTopics: string[];
  explanationStyle: string | null;
  habits: string[];
  topicWeights?: Record<string, number>;
  interestEntries?: ProfileInterest[];
  understanding?: Record<string, UnderstandingLevel>;
  explainPrefs?: ExplainPrefs;
  correctedFields?: string[];
  updatedAt: string;
}

export interface ProfileCorrectionPatch {
  understanding?: Record<string, UnderstandingLevel>;
  interestWeights?: Record<string, number>;
  explainPrefs?: Partial<ExplainPrefs>;
}

export const RAG_BASIC_DEFINITION_SUBSTRING = "RAG 是检索增强生成";

export const DEFAULT_EXPLAIN_PREFS: ExplainPrefs = {
  preferMetaphor: true,
  preferSourceCode: false,
  preferArchitecture: false,
  preferInterview: false,
};

/** C2 demo interests — 0.5 is neutral for B2 ranking; C2 rerank tests patch explicitly. */
export const DEFAULT_PROFILE_INTEREST_ENTRIES: ProfileInterest[] = [
  { id: "voice_realtime", label: "实时语音", weight: 0.5 },
  { id: "knowledge_graph", label: "知识图谱", weight: 0.5 },
  { id: "ai_news", label: "AI 资讯", weight: 0.6 },
];

export const DEFAULT_PROFILE_UNDERSTANDING: Record<string, UnderstandingLevel> = {
  "demo-rag": "heard",
};

export function clampInterestWeight(weight: number): number {
  if (!Number.isFinite(weight)) {
    return 0;
  }
  return Math.min(1, Math.max(0, weight));
}

export function getInterestWeight(
  interestEntries: ProfileInterest[] | undefined,
  interestId: string,
): number {
  const entry = interestEntries?.find((item) => item.id === interestId);
  if (!entry) {
    return 0.5;
  }
  return clampInterestWeight(entry.weight);
}

export function snapshotProfile(
  profile: import("@/domain/profile").UserProfile,
): UserProfileSnapshot {
  return {
    displayName: profile.displayName,
    companionName: profile.companionName,
    persona: profile.persona,
    interests: [...profile.interests],
    knownTopics: [...profile.knownTopics],
    unknownTopics: [...profile.unknownTopics],
    explanationStyle: profile.explanationStyle,
    habits: [...profile.habits],
    topicWeights: profile.topicWeights ? { ...profile.topicWeights } : undefined,
    interestEntries: profile.interestEntries?.map((entry) => ({ ...entry })),
    understanding: profile.understanding ? { ...profile.understanding } : undefined,
    explainPrefs: profile.explainPrefs ? { ...profile.explainPrefs } : undefined,
    correctedFields: profile.correctedFields ? [...profile.correctedFields] : undefined,
    updatedAt: profile.updatedAt,
  };
}

export function restoreProfileSnapshot(
  snapshot: UserProfileSnapshot,
): import("@/domain/profile").UserProfile {
  return {
    ...snapshot,
    interests: [...snapshot.interests],
    knownTopics: [...snapshot.knownTopics],
    unknownTopics: [...snapshot.unknownTopics],
    habits: [...snapshot.habits],
    topicWeights: snapshot.topicWeights ? { ...snapshot.topicWeights } : undefined,
    interestEntries: snapshot.interestEntries?.map((entry) => ({ ...entry })),
    understanding: snapshot.understanding ? { ...snapshot.understanding } : undefined,
    explainPrefs: snapshot.explainPrefs ? { ...snapshot.explainPrefs } : undefined,
    correctedFields: snapshot.correctedFields ? [...snapshot.correctedFields] : undefined,
  };
}

function correctionFieldForUnderstanding(conceptId: string): string {
  return `understanding.${conceptId}`;
}

function correctionFieldForInterest(interestId: string): string {
  return `interest.${interestId}`;
}

function upsertInterestEntries(
  entries: ProfileInterest[] | undefined,
  interestId: string,
  weight: number,
): ProfileInterest[] {
  const base = entries ? [...entries] : [...DEFAULT_PROFILE_INTEREST_ENTRIES];
  const index = base.findIndex((entry) => entry.id === interestId);
  const clamped = clampInterestWeight(weight);
  if (index >= 0) {
    base[index] = { ...base[index], weight: clamped };
    return base;
  }
  return [...base, { id: interestId, label: interestId, weight: clamped }];
}

export function applyProfileCorrectionPatch(
  profile: import("@/domain/profile").UserProfile,
  patch: ProfileCorrectionPatch,
  at = new Date().toISOString(),
): {
  profile: import("@/domain/profile").UserProfile;
  corrections: ProfileCorrection[];
} {
  let next = { ...profile };
  const corrections: ProfileCorrection[] = [];
  const correctedFields = new Set(profile.correctedFields ?? []);

  if (patch.understanding) {
    const understanding = { ...(profile.understanding ?? DEFAULT_PROFILE_UNDERSTANDING) };
    for (const [conceptId, level] of Object.entries(patch.understanding)) {
      const field = correctionFieldForUnderstanding(conceptId);
      const previousValue = understanding[conceptId];
      if (previousValue === level) {
        continue;
      }
      understanding[conceptId] = level;
      correctedFields.add(field);
      corrections.push({
        field,
        previousValue: previousValue ?? "unfamiliar",
        nextValue: level,
        correctionAt: at,
      });
    }
    next = { ...next, understanding };
  }

  if (patch.interestWeights) {
    let interestEntries = profile.interestEntries ?? [...DEFAULT_PROFILE_INTEREST_ENTRIES];
    for (const [interestId, weight] of Object.entries(patch.interestWeights)) {
      const field = correctionFieldForInterest(interestId);
      const previousValue = getInterestWeight(interestEntries, interestId);
      const clamped = clampInterestWeight(weight);
      if (previousValue === clamped) {
        continue;
      }
      interestEntries = upsertInterestEntries(interestEntries, interestId, clamped);
      correctedFields.add(field);
      corrections.push({
        field,
        previousValue,
        nextValue: clamped,
        correctionAt: at,
      });
    }
    next = { ...next, interestEntries };
  }

  if (patch.explainPrefs) {
    const explainPrefs = {
      ...(profile.explainPrefs ?? DEFAULT_EXPLAIN_PREFS),
      ...patch.explainPrefs,
    };
    const field = "explainPrefs";
    const previousValue = profile.explainPrefs ?? DEFAULT_EXPLAIN_PREFS;
    correctedFields.add(field);
    corrections.push({
      field,
      previousValue,
      nextValue: explainPrefs,
      correctionAt: at,
    });
    next = { ...next, explainPrefs };
  }

  if (corrections.length === 0) {
    return { profile, corrections };
  }

  return {
    profile: {
      ...next,
      correctedFields: Array.from(correctedFields),
      updatedAt: at,
    },
    corrections,
  };
}

export function isFieldUserCorrected(
  correctedFields: string[] | undefined,
  field: string,
): boolean {
  return (correctedFields ?? []).includes(field);
}
