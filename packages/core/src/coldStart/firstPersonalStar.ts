import type { UserModeProfile } from "../domain/userMode.js";
import { userModeLabel } from "../profile/correctionHistory.js";

export interface FirstStarCandidate {
  concept: string;
  intro: string;
  sourceLinks: string[];
}

/** Derive first personal star from cold-start user expression (not fixed news). */
export function deriveFirstStarCandidate(
  utterances: string[],
  profile: UserModeProfile,
): FirstStarCandidate {
  const expression = (utterances.at(-1) ?? profile.recentIntent ?? "").trim();
  const fallback = `${userModeLabel(profile.primaryMode)}起点`;
  const concept = pickConceptTitle(expression) || fallback;
  return {
    concept,
    intro: expression.length > 0 ? `来自冷启动：${expression}` : `来自冷启动画像：${fallback}`,
    sourceLinks: [`cold-start:expression:${utterances.length}`],
  };
}

function pickConceptTitle(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= 24) {
    return trimmed;
  }
  const clause = trimmed.split(/[，。；,\n]/)[0]?.trim() ?? trimmed;
  return clause.length > 24 ? `${clause.slice(0, 22)}…` : clause;
}
