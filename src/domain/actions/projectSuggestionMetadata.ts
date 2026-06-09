import type {
  CognitiveAction,
  ProjectSuggestionMetadata,
} from "@/domain/actions/cognitiveAction";
import { isProjectSuggestionMetadata } from "@/domain/actions/cognitiveAction";

export type { ProjectSuggestionMetadata };

export const BANNED_SUGGESTION_PHRASES = [
  "你应该更好",
  "建议你先想想",
  "可以考虑改进",
  "需要提升",
] as const;

export function containsBannedSuggestionPhrase(text: string): string | null {
  const normalized = text.trim();
  for (const phrase of BANNED_SUGGESTION_PHRASES) {
    if (normalized.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

/** Read structured project suggestion fields from CognitiveAction.metadata. */
export function parseMetadataFromAction(
  action: CognitiveAction,
): ProjectSuggestionMetadata | null {
  if (!action.metadata || !isProjectSuggestionMetadata(action.metadata)) {
    return null;
  }
  return action.metadata;
}

export function buildProjectSuggestionBodyMarkdown(sections: {
  intro: string;
  reason: string;
  expectedImpact: string;
  suggestedNextStep: string;
}): string {
  return [
    sections.intro,
    "",
    "## 原因",
    sections.reason,
    "",
    "## 预期影响",
    sections.expectedImpact,
    "",
    "## 建议下一步",
    sections.suggestedNextStep,
  ].join("\n");
}
