import type { UserProfile } from "@/domain/profile";
import {
  DEFAULT_PROFILE_UNDERSTANDING,
  RAG_BASIC_DEFINITION_SUBSTRING,
  type UnderstandingLevel,
} from "@/domain/profile/userProfile";

const TEACHING_COPY: Record<string, Record<UnderstandingLevel, string>> = {
  "demo-rag": {
    unfamiliar: `先从定义说起：${RAG_BASIC_DEFINITION_SUBSTRING}，它把检索和生成拼在一起，适合个人知识库问答。`,
    heard: "你听过 RAG 了，我们直接看用例：怎么把本地 SQLite 里的概念节点接到检索链路里。",
    can_explain:
      "既然你能讲清 RAG，我们聊架构取舍：向量召回 vs 图谱邻域扩展，以及在你这个伴侣项目里怎么控延迟。",
  },
};

export function resolveUnderstandingLevel(
  profile: UserProfile,
  conceptId: string,
): UnderstandingLevel {
  return (
    profile.understanding?.[conceptId] ??
    DEFAULT_PROFILE_UNDERSTANDING[conceptId] ??
    "unfamiliar"
  );
}

/** Mock teaching turn text keyed by profile understanding depth (C2 golden). */
export function buildTeachingTurn(conceptId: string, profile: UserProfile): string {
  const level = resolveUnderstandingLevel(profile, conceptId);
  const copy = TEACHING_COPY[conceptId];
  if (!copy) {
    return `暂无 ${conceptId} 的讲解模板（level=${level}）。`;
  }
  return copy[level];
}

export function teachingTurnIncludesBasicDefinition(text: string): boolean {
  return text.includes(RAG_BASIC_DEFINITION_SUBSTRING);
}
