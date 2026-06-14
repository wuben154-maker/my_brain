import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import type { UserMode, UserModeProfile } from "../domain/userMode.js";

export interface ColdStartFixture {
  id: string;
  userUtterance: string;
  expectedPrimary: UserMode;
  expectedSecondary?: UserMode[];
  firstStarSource: string;
}

export const COLD_START_FIXTURES: ColdStartFixture[] = [
  {
    id: "cold-tech-tracker",
    userUtterance: "我想跟进 AI 和开源",
    expectedPrimary: "tech_tracker",
    firstStarSource: "AI 新闻或 GitHub 趋势",
  },
  {
    id: "cold-learner",
    userUtterance: "我在学 Rust 所有权",
    expectedPrimary: "learner",
    firstStarSource: "学习主题",
  },
  {
    id: "cold-personal-capture",
    userUtterance: "记下这个创业想法",
    expectedPrimary: "personal_memory",
    firstStarSource: "用户想法",
  },
  {
    id: "cold-mixed-learner-life",
    userUtterance: "学 Rust 也想记生活灵感",
    expectedPrimary: "learner",
    expectedSecondary: ["personal_memory"],
    firstStarSource: "学习+捕获混合",
  },
];

const KEYWORDS: Array<{ modes: UserMode[]; patterns: RegExp[] }> = [
  {
    modes: ["tech_tracker"],
    patterns: [/AI|开源|GitHub|趋势|资讯/i],
  },
  {
    modes: ["learner"],
    patterns: [/学|学习|Rust|所有权|概念/i],
  },
  {
    modes: ["personal_memory", "founder_project"],
    patterns: [/记下|想法|创业|灵感|生活/i],
  },
];

export function inferUserModeProfileFromDialogue(
  utterances: string[],
  fixtureId?: string,
): UserModeProfile {
  if (fixtureId) {
    const fixture = COLD_START_FIXTURES.find((f) => f.id === fixtureId);
    if (fixture) {
      return {
        primaryMode: fixture.expectedPrimary,
        secondaryModes: fixture.expectedSecondary ?? [],
        confidence: 0.82,
        recentIntent: fixture.userUtterance,
      };
    }
  }

  const text = utterances.join(" ");
  const matched = new Set<UserMode>();
  for (const rule of KEYWORDS) {
    if (rule.patterns.some((p) => p.test(text))) {
      for (const mode of rule.modes) {
        matched.add(mode);
      }
    }
  }

  if (matched.size === 0) {
    return {
      primaryMode: "personal_memory",
      secondaryModes: [],
      confidence: 0.45,
      recentIntent: utterances.at(-1),
    };
  }

  const modes = [...matched];
  return {
    primaryMode: modes[0] ?? "personal_memory",
    secondaryModes: modes.slice(1),
    confidence: Math.min(0.55 + modes.length * 0.15, 0.92),
    recentIntent: utterances.at(-1),
  };
}

export function rankAdaptiveSignals(signals: AdaptiveSignal[]): AdaptiveSignal[] {
  return [...signals].sort((a, b) => {
    const scoreA = a.freshness * 0.4 + a.confidence * 0.6;
    const scoreB = b.freshness * 0.4 + b.confidence * 0.6;
    return scoreB - scoreA;
  });
}

function signalForMode(
  mode: UserMode,
  index: number,
  sourceType: AdaptiveSignal["sourceType"],
  title: string,
): AdaptiveSignal {
  return {
    sourceType,
    userModeFit: mode,
    freshness: 0.9 - index * 0.1,
    evidenceRefs: [`fixture:${mode}:${index}`],
    confidence: 0.75 + index * 0.05,
    privacyLevel: "local_only",
    suggestedIntent: sourceType === "capture" ? "capture" : "explain_more",
  };
}

export function generateAdaptiveSignals(
  profile: UserModeProfile,
  suppressionList: string[] = [],
): AdaptiveSignal[] {
  const raw: AdaptiveSignal[] = [];
  const primary = profile.primaryMode;

  if (primary === "tech_tracker") {
    raw.push(
      signalForMode(primary, 0, "radar", "OpenAI 实时 API 更新"),
      signalForMode(primary, 1, "radar", "GitHub 今日星标增速"),
    );
  } else if (primary === "learner") {
    raw.push(
      signalForMode(primary, 0, "learning", "Rust 所有权 — 30 秒讲清楚"),
      signalForMode(primary, 1, "learning", "借用 vs 所有权 — 对比卡"),
    );
    if (profile.secondaryModes.includes("personal_memory")) {
      raw.push(signalForMode("personal_memory", 2, "capture", "生活灵感 — 待回顾"));
    }
  } else if (primary === "personal_memory") {
    raw.push(
      signalForMode(primary, 0, "capture", "创业想法 — 语音笔记 App"),
      signalForMode(primary, 1, "memory", "上次记下的灵感"),
    );
  } else {
    raw.push(
      signalForMode(primary, 0, "project", "项目进展 — 待整理"),
      signalForMode(primary, 1, "memory", "最近对话摘要"),
    );
  }

  const filtered = raw.filter(
    (s) => !suppressionList.includes(`mode-${s.userModeFit}`),
  );
  return rankAdaptiveSignals(filtered).slice(0, 3);
}

export interface MemoryWeatherSnapshot {
  mood: "calm" | "curious" | "focused";
  headline: string;
  evidenceRefs: string[];
}

export function buildMemoryWeatherV0(
  profile: UserModeProfile,
  nodeCount: number,
): MemoryWeatherSnapshot {
  if (nodeCount === 0) {
    return {
      mood: "calm",
      headline: "星座还空着，聊几句就会亮起来",
      evidenceRefs: ["weather:empty"],
    };
  }
  if (profile.primaryMode === "learner") {
    return {
      mood: "focused",
      headline: `学习向 — 已有 ${nodeCount} 颗概念星`,
      evidenceRefs: ["weather:learner"],
    };
  }
  if (profile.primaryMode === "tech_tracker") {
    return {
      mood: "curious",
      headline: `追踪向 — ${nodeCount} 个概念在图谱里`,
      evidenceRefs: ["weather:tech"],
    };
  }
  return {
    mood: "calm",
    headline: `记忆向 — ${nodeCount} 颗星在呼吸`,
    evidenceRefs: ["weather:memory"],
  };
}
