/** Cognitive action permission levels — aligned with KNOWLEDGE_OS trust model. */

export const COGNITIVE_PERMISSION_LEVELS = [
  "read",
  "suggest",
  "auto-organize",
  "user-confirmed-write",
] as const;

export type CognitivePermissionLevel = (typeof COGNITIVE_PERMISSION_LEVELS)[number];

export const COGNITIVE_ACTION_TYPES = [
  "draft_github_issue",
  "draft_blog_post",
  "draft_roadmap",
  "draft_learning_path",
  "draft_research_followup",
  "draft_weekly_review",
] as const;

export type CognitiveActionType = (typeof COGNITIVE_ACTION_TYPES)[number];

export type ActionDraftStatus = "draft" | "saved" | "executed" | "failed" | "cancelled";

export interface ActionConfirmation {
  confirmationToken: string;
  confirmedAt: string;
}

export interface DraftGithubIssuePayload {
  title: string;
  bodyMarkdown: string;
  repoHint?: string;
}

export interface DraftBlogPostPayload {
  title: string;
  outline: string[];
  bodyDraft: string;
}

export interface DraftRoadmapPayload {
  title: string;
  phases: Array<{ name: string; goals: string[] }>;
}

export interface DraftLearningPathPayload {
  title: string;
  conceptSequence: string[];
  resourceLinks: string[];
}

export interface DraftResearchFollowupPayload {
  question: string;
  searchSuggestions: string[];
}

export interface DraftWeeklyReviewPayload {
  title: string;
  summaryText: string;
}

export type ActionDraftPayload =
  | DraftGithubIssuePayload
  | DraftBlogPostPayload
  | DraftRoadmapPayload
  | DraftLearningPathPayload
  | DraftResearchFollowupPayload
  | DraftWeeklyReviewPayload;

export interface ActionDraft {
  actionId: string;
  actionType: CognitiveActionType;
  status: ActionDraftStatus;
  permissionLevel: CognitivePermissionLevel;
  createdAt: string;
  updatedAt: string;
  payload: ActionDraftPayload;
}

/** Audit log row — metadata only; no draft body or secrets. */
export interface ActionAuditEntry {
  actionId: string;
  actionType: CognitiveActionType;
  createdAt: string;
  confirmedAt?: string;
  status: ActionDraftStatus | "pending_confirmation";
  errorCode?: string;
  requestId?: string;
}

export interface ActionDraftBuildContext {
  title?: string;
  summary?: string;
  conceptNames?: string[];
  repoHint?: string;
}
