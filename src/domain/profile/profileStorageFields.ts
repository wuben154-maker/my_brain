import type { UserProfile } from "@/domain/profile";
import {
  DEFAULT_EXPLAIN_PREFS,
  DEFAULT_PROFILE_INTEREST_ENTRIES,
  DEFAULT_PROFILE_UNDERSTANDING,
} from "@/domain/profile/userProfile";

/** Key/value pairs persisted in user_profile table beyond legacy fields. */
export function serializeProfileExtensionFields(
  profile: UserProfile,
): Record<string, string> {
  return {
    interestEntries: JSON.stringify(
      profile.interestEntries ?? DEFAULT_PROFILE_INTEREST_ENTRIES,
    ),
    understanding: JSON.stringify(
      profile.understanding ?? DEFAULT_PROFILE_UNDERSTANDING,
    ),
    explainPrefs: JSON.stringify(profile.explainPrefs ?? DEFAULT_EXPLAIN_PREFS),
    correctedFields: JSON.stringify(profile.correctedFields ?? []),
  };
}

export function parseProfileExtensionFields(
  map: Record<string, string>,
): Pick<
  UserProfile,
  "interestEntries" | "understanding" | "explainPrefs" | "correctedFields"
> {
  const interestEntries = map.interestEntries
    ? (JSON.parse(map.interestEntries) as UserProfile["interestEntries"])
    : DEFAULT_PROFILE_INTEREST_ENTRIES.map((entry) => ({ ...entry }));
  const understanding = map.understanding
    ? (JSON.parse(map.understanding) as UserProfile["understanding"])
    : { ...DEFAULT_PROFILE_UNDERSTANDING };
  const explainPrefs = map.explainPrefs
    ? (JSON.parse(map.explainPrefs) as UserProfile["explainPrefs"])
    : { ...DEFAULT_EXPLAIN_PREFS };
  const correctedFields = map.correctedFields
    ? (JSON.parse(map.correctedFields) as string[])
    : [];

  return {
    interestEntries,
    understanding,
    explainPrefs,
    correctedFields,
  };
}
