import type { CognitiveActionType } from "../actions/types.js";
import type { UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord, GraphSnapshot } from "../graph/types.js";
import { userModeLabel } from "../profile/correctionHistory.js";

export type ReviewDraftActionKind =
  | "weekly_review"
  | "learning_coach"
  | "project"
  | "writing"
  | "research";

export interface ReviewDraftAction {
  id: string;
  kind: ReviewDraftActionKind;
  title: string;
  summary: string;
  status: "draft";
}

export interface WeeklyReviewDraft {
  title: string;
  summary: string;
  highlights: string[];
  status: "draft";
}

function visibleConcepts(snapshot: GraphSnapshot): string[] {
  return snapshot.nodes.filter((node) => !node.archived).map((node) => node.concept);
}

function recentChangeSummaries(history: GraphChangeRecord[], limit = 5): string[] {
  return history
    .filter((change) => !change.undone)
    .slice(-limit)
    .map((change) => change.summary);
}

/** Weekly review draft from graph/profile — no external writes. */
export function buildWeeklyReviewDraft(
  snapshot: GraphSnapshot,
  profile: UserModeProfile,
  history: GraphChangeRecord[],
): WeeklyReviewDraft {
  const concepts = visibleConcepts(snapshot);
  const changes = recentChangeSummaries(history);
  const modeLabel = userModeLabel(profile.primaryMode);

  const highlights =
    changes.length > 0
      ? changes
      : concepts.slice(0, 3).map((concept) => `概念「${concept}」待回顾`);

  const summaryParts = [
    `以${modeLabel}视角回顾 ${concepts.length} 个活跃概念`,
    changes.length > 0 ? `近期 ${changes.length} 条图谱变更` : "本周暂无图谱变更",
  ];
  if (profile.recentIntent?.trim()) {
    summaryParts.push(`近期意图：${profile.recentIntent.trim()}`);
  }

  return {
    title: "本周回顾草稿",
    summary: summaryParts.join("；"),
    highlights,
    status: "draft",
  };
}

/** Suggest draft-only review/coach/project/writing/research actions. */
export function buildDraftOnlyActions(
  snapshot: GraphSnapshot,
  profile: UserModeProfile,
): ReviewDraftAction[] {
  const concepts = visibleConcepts(snapshot);
  const topConcepts = concepts.slice(0, 3);
  const conceptHint = topConcepts.length > 0 ? topConcepts.join("、") : "当前主题";

  const actions: ReviewDraftAction[] = [
    {
      id: "draft-weekly-review",
      kind: "weekly_review",
      title: "整理本周回顾",
      summary: `基于 ${concepts.length} 个概念生成本周回顾草稿`,
      status: "draft",
    },
  ];

  if (profile.primaryMode === "learner" || profile.secondaryModes.includes("learner")) {
    actions.push({
      id: "draft-learning-coach",
      kind: "learning_coach",
      title: "学习教练建议",
      summary: `围绕 ${conceptHint} 生成复习节奏草稿`,
      status: "draft",
    });
  }

  if (
    profile.primaryMode === "founder_project" ||
    profile.secondaryModes.includes("founder_project")
  ) {
    actions.push({
      id: "draft-project",
      kind: "project",
      title: "项目推进草稿",
      summary: `从 ${conceptHint} 提炼下一步行动草稿`,
      status: "draft",
    });
  }

  if (
    profile.primaryMode === "creator_researcher" ||
    profile.secondaryModes.includes("creator_researcher")
  ) {
    actions.push({
      id: "draft-writing",
      kind: "writing",
      title: "写作提纲草稿",
      summary: `将 ${conceptHint} 整理为可发布提纲草稿`,
      status: "draft",
    });
    actions.push({
      id: "draft-research",
      kind: "research",
      title: "研究跟进草稿",
      summary: `为 ${conceptHint} 生成后续检索问题草稿`,
      status: "draft",
    });
  }

  return actions;
}

/** Map review-layer suggestions to draftBuilder action types — still draft-only. */
export function cognitiveActionTypeForReviewDraft(
  kind: ReviewDraftActionKind,
): CognitiveActionType {
  switch (kind) {
    case "weekly_review":
      return "draft_weekly_review";
    case "learning_coach":
      return "draft_learning_path";
    case "project":
      return "draft_roadmap";
    case "writing":
      return "draft_blog_post";
    case "research":
      return "draft_research_followup";
  }
}

export const DEFAULT_REVIEW_PROFILE: UserModeProfile = {
  primaryMode: "tech_tracker",
  secondaryModes: [],
  confidence: 0,
};
