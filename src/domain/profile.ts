export type PersonaPreset = "mentor" | "companion" | "geek";

export interface UserProfile {
  displayName: string | null;
  companionName: string | null;
  persona: PersonaPreset;
  interests: string[];
  knownTopics: string[];
  unknownTopics: string[];
  explanationStyle: string | null;
  habits: string[];
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
  updatedAt: new Date(0).toISOString(),
};
