import type { UserProfile } from "@/domain/profile";
import type { BriefingFeedback } from "@/domain/radar/briefingItem";
import type { RadarSignal } from "@/domain/radar/radarSignal";
import {
  DEFAULT_PROFILE_UNDERSTANDING,
  getInterestWeight,
  RAG_BASIC_DEFINITION_SUBSTRING,
  type UnderstandingLevel,
} from "@/domain/profile/userProfile";
import { resolveBriefingElaborationDepth } from "@/radar/briefingElaboration";

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

const UNDERSTANDING_LABELS: Record<UnderstandingLevel, string> = {
  unfamiliar: "未接触",
  heard: "听过",
  can_explain: "能解释",
};

/** Profile understanding → base elaboration depth (0=intro, 1=use-case, 2=architecture). */
export function profileBaseElaborationDepth(
  profile: UserProfile,
  conceptId: string,
): number {
  const level = resolveUnderstandingLevel(profile, conceptId);
  if (level === "can_explain") {
    return 2;
  }
  if (level === "heard") {
    return 1;
  }
  return 0;
}

/** KP-05: profile correction base + briefing feedback offset. */
export function resolveTeachingElaborationDepth(input: {
  profile: UserProfile;
  conceptId: string;
  worldItemId: string;
  signals: RadarSignal[];
  feedbackByItemId: Record<string, BriefingFeedback[]>;
  topicKeyByItemId: Record<string, string>;
}): number {
  return resolveBriefingElaborationDepth({
    baseDepth: profileBaseElaborationDepth(input.profile, input.conceptId),
    worldItemId: input.worldItemId,
    signals: input.signals,
    feedbackByItemId: input.feedbackByItemId,
    topicKeyByItemId: input.topicKeyByItemId,
  });
}

export function formatElaborationDepthPrefix(depth: number): string {
  if (depth <= 0) {
    return "";
  }
  return `【深度 ${depth}】`;
}

/** User-visible rationale: signal explanation + profile summary (non-black-box). */
export function buildProfileTeachingRationale(
  profile: UserProfile,
  signal?: RadarSignal,
): string[] {
  const lines: string[] = [];
  if (signal?.explanation.trim()) {
    lines.push(`推荐依据：${signal.explanation.trim()}`);
  }
  const ragLevel = resolveUnderstandingLevel(profile, "demo-rag");
  lines.push(`RAG 理解：${UNDERSTANDING_LABELS[ragLevel]}`);
  const voiceWeight = getInterestWeight(profile.interestEntries, "voice_realtime");
  lines.push(`实时语音权重：${voiceWeight.toFixed(1)}`);
  const prefs = profile.explainPrefs;
  if (prefs) {
    const styleParts: string[] = [];
    if (prefs.preferMetaphor) {
      styleParts.push("比喻");
    }
    if (prefs.preferArchitecture) {
      styleParts.push("架构");
    }
    if (prefs.preferSourceCode) {
      styleParts.push("源码");
    }
    if (styleParts.length > 0) {
      lines.push(`讲解偏好：${styleParts.join("、")}`);
    }
  }
  if (profile.correctedFields?.length) {
    lines.push(`已修正：${profile.correctedFields.join("、")}`);
  }
  return lines;
}
