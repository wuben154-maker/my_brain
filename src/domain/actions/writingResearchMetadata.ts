import type {
  BlogDraftMetadata,
  CognitiveAction,
  ResearchFollowupMetadata,
} from "@/domain/actions/cognitiveAction";
import {
  isBlogDraftMetadata,
  isResearchFollowupMetadata,
} from "@/domain/actions/cognitiveAction";

export type { BlogDraftMetadata, ResearchFollowupMetadata };

export const BANNED_RESEARCH_PHRASES = ["新发现"] as const;

export function containsBannedResearchPhrase(text: string): string | null {
  const normalized = text.trim();
  for (const phrase of BANNED_RESEARCH_PHRASES) {
    if (normalized.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

export function parseBlogMetadataFromAction(
  action: CognitiveAction,
): BlogDraftMetadata | null {
  if (action.kind !== "blog_draft" || !action.metadata) {
    return null;
  }
  return isBlogDraftMetadata(action.metadata) ? action.metadata : null;
}

export function parseResearchMetadataFromAction(
  action: CognitiveAction,
): ResearchFollowupMetadata | null {
  if (action.kind !== "research_followup" || !action.metadata) {
    return null;
  }
  return isResearchFollowupMetadata(action.metadata) ? action.metadata : null;
}

export function buildBlogDraftBodyMarkdown(input: {
  title: string;
  sections: BlogDraftMetadata["sections"];
  referenceLines: string[];
}): string {
  const parts: string[] = [`# ${input.title}`, ""];
  for (const section of input.sections) {
    parts.push(`## ${section.heading}`, section.body, "");
  }
  parts.push("## 参考来源");
  if (input.referenceLines.length === 0) {
    parts.push("- （暂无外链来源）");
  } else {
    parts.push(...input.referenceLines);
  }
  return parts.join("\n").trimEnd();
}

export function buildResearchFollowupBodyMarkdown(input: {
  seedLabel: string;
  items: ResearchFollowupMetadata["researchItems"];
}): string {
  const lines = [
    `# 研究追踪建议 · ${input.seedLabel}`,
    "",
    "以下为本地 draft 追踪项，不会自动入库或 ingest WorldItem。",
    "",
  ];
  input.items.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.label}`, item.reason, "");
    if (item.worldItemId) {
      lines.push(`- WorldItem: \`${item.worldItemId}\``, "");
    }
    if (item.query) {
      lines.push(`- 建议检索: \`${item.query}\``, "");
    }
  });
  return lines.join("\n").trimEnd();
}
