import type { UserProfile } from "@/domain/profile";
import { loadPersonaPreset } from "@/persona/loadPreset";
import type {
  ExpressionPlan,
  PersonaPresetDefinition,
  PersonaVerbosity,
} from "@/persona/types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function topicInList(haystack: string, topics: string[]): boolean {
  const lower = haystack.toLowerCase();
  return topics.some((topic) => {
    const needle = topic.trim().toLowerCase();
    return needle.length > 0 && lower.includes(needle);
  });
}

function adjustVerbosity(
  base: PersonaVerbosity,
  profile: UserProfile,
  topicHint: string,
): PersonaVerbosity {
  const order: PersonaVerbosity[] = ["concise", "balanced", "detailed"];
  let index = order.indexOf(base);
  if (topicInList(topicHint, profile.knownTopics)) {
    index = Math.max(0, index - 1);
  }
  if (topicInList(topicHint, profile.unknownTopics)) {
    index = Math.min(order.length - 1, index + 1);
  }
  return order[index] ?? base;
}

/** Feel-first: decide tone/depth before shaping user-visible text. */
export function buildExpressionPlan(
  preset: PersonaPresetDefinition,
  profile: UserProfile,
  recalledGrounding?: string,
  topicHint = "",
): ExpressionPlan {
  const verbosity = adjustVerbosity(preset.verbosity, profile, topicHint);
  let technicality = preset.technicality;
  if (topicInList(topicHint, profile.unknownTopics)) {
    technicality = clamp01(technicality + 0.15);
  }
  if (topicInList(topicHint, profile.knownTopics)) {
    technicality = clamp01(technicality - 0.1);
  }

  const depthLabel =
    verbosity === "concise"
      ? "简短"
      : verbosity === "detailed"
        ? "展开"
        : "适中";
  const memoryNote = recalledGrounding?.trim()
    ? "结合已召回记忆，避免重复铺垫。"
    : "无额外记忆上下文。";
  const styleNote = profile.explanationStyle?.trim()
    ? `用户偏好：${profile.explanationStyle.trim()}`
    : "默认中文讲解，保留英文术语。";

  return {
    innerIntent: [
      `口吻：${preset.tone}（${preset.name}）`,
      `详略：${depthLabel}`,
      `技术深度：${(technicality * 100).toFixed(0)}%`,
      styleNote,
      memoryNote,
    ].join("；"),
    verbosity,
    technicality,
    warmth: preset.warmth,
  };
}

const VERBOSITY_HINT: Record<PersonaVerbosity, string> = {
  concise: "【简版】",
  balanced: "【标准】",
  detailed: "【展开】",
};

/** Second pass: shape expression without altering factual payload. */
export function applyPersonaStyle(
  preset: PersonaPresetDefinition,
  plan: ExpressionPlan,
  content: string,
): string {
  const trimmed = content.trim();
  const prefix = [preset.opening, VERBOSITY_HINT[plan.verbosity]]
    .filter((part) => part.length > 0)
    .join(" ");
  const suffix = preset.closing.length > 0 ? ` ${preset.closing}` : "";
  return `${prefix} ${trimmed}${suffix}`.trim();
}

export function stylizeExplanation(
  profile: UserProfile,
  content: string,
  options: { recalledGrounding?: string; topicHint?: string } = {},
): string {
  const preset = loadPersonaPreset(profile.persona);
  const plan = buildExpressionPlan(
    preset,
    profile,
    options.recalledGrounding,
    options.topicHint ?? "",
  );
  return applyPersonaStyle(preset, plan, content);
}
