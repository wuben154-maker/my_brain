import { permissionLevelForAction } from "./executionGate.js";
import type {
  ActionDraft,
  ActionDraftBuildContext,
  CognitiveActionType,
} from "./types.js";

function newActionId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Build draft-only cognitive actions — never writes permanent graph nodes. */
export function buildActionDraft(
  actionType: CognitiveActionType,
  context: ActionDraftBuildContext = {},
): ActionDraft {
  const createdAt = nowIso();
  const title = context.title?.trim() || "未命名草稿";
  const summary = context.summary?.trim() || "基于当前图谱与对话生成的建议草稿。";
  const concepts = context.conceptNames ?? [];

  switch (actionType) {
    case "draft_github_issue":
      return {
        actionId: newActionId(),
        actionType,
        status: "draft",
        permissionLevel: permissionLevelForAction(actionType),
        createdAt,
        updatedAt: createdAt,
        payload: {
          title,
          bodyMarkdown: `## 背景\n\n${summary}\n\n## 相关概念\n\n${concepts.map((c) => `- ${c}`).join("\n") || "- （暂无）"}\n\n## 待办\n\n- [ ] 补充细节\n`,
          repoHint: context.repoHint,
        },
      };
    case "draft_blog_post":
      return {
        actionId: newActionId(),
        actionType,
        status: "draft",
        permissionLevel: permissionLevelForAction(actionType),
        createdAt,
        updatedAt: createdAt,
        payload: {
          title,
          outline: ["引言", "核心观点", "实践建议", "总结"],
          bodyDraft: summary,
        },
      };
    case "draft_roadmap":
      return {
        actionId: newActionId(),
        actionType,
        status: "draft",
        permissionLevel: permissionLevelForAction(actionType),
        createdAt,
        updatedAt: createdAt,
        payload: {
          title,
          phases: [
            { name: "探索", goals: ["梳理问题", "收集来源"] },
            { name: "沉淀", goals: concepts.slice(0, 3).map((c) => `深化 ${c}`) },
            { name: "输出", goals: ["生成草稿", "用户确认后分享"] },
          ],
        },
      };
    case "draft_learning_path":
      return {
        actionId: newActionId(),
        actionType,
        status: "draft",
        permissionLevel: permissionLevelForAction(actionType),
        createdAt,
        updatedAt: createdAt,
        payload: {
          title,
          conceptSequence: concepts.length > 0 ? concepts : ["基础概念", "关联扩展", "实践回顾"],
          resourceLinks: [],
        },
      };
    case "draft_research_followup":
      return {
        actionId: newActionId(),
        actionType,
        status: "draft",
        permissionLevel: permissionLevelForAction(actionType),
        createdAt,
        updatedAt: createdAt,
        payload: {
          question: title,
          searchSuggestions: concepts.length > 0 ? concepts.map((c) => `${c} 最新进展`) : [summary],
        },
      };
    case "draft_weekly_review":
      return {
        actionId: newActionId(),
        actionType,
        status: "draft",
        permissionLevel: permissionLevelForAction(actionType),
        createdAt,
        updatedAt: createdAt,
        payload: {
          title: title || "本周大脑回顾",
          summaryText: summary,
        },
      };
    default: {
      const _exhaustive: never = actionType;
      throw new Error(`Unsupported action type: ${_exhaustive}`);
    }
  }
}
