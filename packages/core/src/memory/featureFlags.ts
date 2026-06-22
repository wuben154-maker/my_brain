/** M5 presentation flags — default-on; must not hide core experiences when evidence exists. */
export interface M5FeatureFlags {
  memory_weather_llm_polish: boolean;
  memory_replay_animations: boolean;
  reverse_question_enabled: boolean;
}

export const M5_FEATURE_FLAG_DEFAULTS: M5FeatureFlags = {
  memory_weather_llm_polish: true,
  memory_replay_animations: true,
  reverse_question_enabled: true,
};

export function resolveM5FeatureFlags(
  overrides?: Partial<M5FeatureFlags>,
): M5FeatureFlags {
  return { ...M5_FEATURE_FLAG_DEFAULTS, ...overrides };
}

export function isM5ExperienceEnabled(
  flags: M5FeatureFlags,
  experience: "weather" | "replay" | "reverse_question",
): boolean {
  switch (experience) {
    case "weather":
      return true;
    case "replay":
      return true;
    case "reverse_question":
      return flags.reverse_question_enabled;
    default:
      return true;
  }
}
