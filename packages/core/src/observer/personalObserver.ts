import type { EphemeralConversationState } from "../conversation/ephemeralChat.js";
import type { UserModeProfile } from "../domain/userMode.js";
import type { GraphRepository } from "../graph/types.js";

export type PersonalSignalSource =
  | "chat"
  | "project"
  | "repeated_question"
  | "learning";

export interface PersonalSignal {
  id: string;
  source: PersonalSignalSource;
  evidence: string[];
  whyUseful: string;
  confidence: number;
}

let personalSignalSeq = 0;

function nextPersonalSignalId(source: PersonalSignalSource): string {
  personalSignalSeq += 1;
  return `psignal-${personalSignalSeq}-${source}`;
}

function normalizeQuestion(text: string): string {
  return text
    .trim()
    .replace(/[？?！!。．…]+$/u, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function findRepeatedQuestions(turns: EphemeralConversationState["turns"]): string[] {
  const userTexts = turns.filter((t) => t.role === "user").map((t) => t.text.trim());
  const counts = new Map<string, { raw: string; count: number }>();
  for (const text of userTexts) {
    if (!text.includes("?") && !text.includes("？")) {
      continue;
    }
    const key = normalizeQuestion(text);
    if (key.length < 4) {
      continue;
    }
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { raw: text, count: 1 });
    }
  }
  return [...counts.values()]
    .filter((entry) => entry.count >= 2)
    .map((entry) => entry.raw);
}

function modeUsefulnessPrefix(profile: UserModeProfile): string {
  switch (profile.primaryMode) {
    case "tech_tracker":
      return "可作为今日技术跟进入口";
    case "learner":
      return "可调整学习复习节奏";
    case "founder_project":
      return "可反映项目推进状态";
    case "personal_memory":
      return "可反映近期个人关注";
    case "creator_researcher":
      return "可反映研究素材方向";
    default:
      return "可反映近期状态";
  }
}

/** Extract bounded personal signals from ephemeral companion chat — no permanent writes. */
export function extractPersonalSignalsFromEphemeralChat(
  chat: EphemeralConversationState,
  profile: UserModeProfile,
): PersonalSignal[] {
  if (chat.memoryRejected) {
    return [];
  }

  const signals: PersonalSignal[] = [];
  const userTurns = chat.turns.filter((t) => t.role === "user");
  const prefix = modeUsefulnessPrefix(profile);
  const baseConfidence = Math.min(0.45 + profile.confidence * 0.35, 0.85);

  for (const [index, turn] of userTurns.entries()) {
    const text = turn.text.trim();
    if (!text) {
      continue;
    }

    if (/项目|推进|阻塞|决策|里程碑/i.test(text)) {
      signals.push({
        id: nextPersonalSignalId("project"),
        source: "project",
        evidence: [
          `companion-chat:${chat.sessionId}`,
          `user-turn:${index + 1}`,
          `text:${text.slice(0, 80)}`,
        ],
        whyUseful: `${prefix}：陪聊里出现项目/推进相关表述，可作为项目线索候选（非确定结论）。`,
        confidence: Math.min(baseConfidence + 0.08, 0.88),
      });
    }

    if (/学|懂|深入|复习|掌握|所有权/i.test(text)) {
      signals.push({
        id: nextPersonalSignalId("learning"),
        source: "learning",
        evidence: [
          `companion-chat:${chat.sessionId}`,
          `user-turn:${index + 1}`,
          `text:${text.slice(0, 80)}`,
        ],
        whyUseful: `${prefix}：对话里出现学习状态变化线索，可用于复习或讲解建议。`,
        confidence: Math.min(baseConfidence + 0.05, 0.86),
      });
    }

    if (/焦虑|压力|慢|累|烦/i.test(text)) {
      signals.push({
        id: nextPersonalSignalId("chat"),
        source: "chat",
        evidence: [
          `companion-chat:${chat.sessionId}`,
          `user-turn:${index + 1}`,
          `text:${text.slice(0, 80)}`,
        ],
        whyUseful: `${prefix}：近期陪聊情绪线索，适合作为陪伴入口而非永久记忆。`,
        confidence: Math.min(baseConfidence, 0.75),
      });
    }
  }

  for (const question of findRepeatedQuestions(chat.turns)) {
    signals.push({
      id: nextPersonalSignalId("repeated_question"),
      source: "repeated_question",
      evidence: [
        `companion-chat:${chat.sessionId}`,
        `repeated-question:${normalizeQuestion(question)}`,
      ],
      whyUseful: `${prefix}：同类问题在会话内重复出现，可作为跟进讲解候选（需更多证据再下结论）。`,
      confidence: Math.min(baseConfidence + 0.1, 0.9),
    });
  }

  return signals.slice(0, 6);
}

/** Guard: personal observer must not create permanent graph nodes or profile writes. */
export function assertPersonalObserverDoesNotMutateGraph(
  graph: GraphRepository,
  beforeNodes: number,
): void {
  if (graph.countVisibleNodes() !== beforeNodes) {
    throw new Error("personal observer must not create permanent graph nodes");
  }
}
