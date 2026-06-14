import type { UserMode, UserModeProfile } from "../domain/userMode.js";

export type DegradedModeCode =
  | "mock_llm"
  | "fixture_radar"
  | "voice_disconnected"
  | "profile_seed_degraded"
  | "legacy_radar"
  | "history_persist_warning"
  | "learning_trace_persist_warning"
  | "storage_degraded";

export const DEGRADED_MODE_LABELS: Record<DegradedModeCode, string> = {
  mock_llm: "语言模型：演示模式",
  fixture_radar: "今日入口：演示数据",
  voice_disconnected: "语音：未连接（文字可用）",
  profile_seed_degraded: "画像识别：演示推断",
  legacy_radar: "雷达：旧版演示数据",
  history_persist_warning: "整理记录：部分未写入磁盘",
  learning_trace_persist_warning: "学习轨迹：部分未写入磁盘",
  storage_degraded: "存储：部分读写降级",
};

export interface DegradedModeState {
  active: DegradedModeCode[];
  providerMode: "mock" | "degraded" | "live";
}

export function createDefaultDegradedState(hasApiKey: boolean): DegradedModeState {
  if (hasApiKey) {
    return { active: [], providerMode: "live" };
  }
  return {
    active: ["mock_llm", "fixture_radar", "voice_disconnected", "profile_seed_degraded"],
    providerMode: "mock",
  };
}

export function degradedBannerText(codes: DegradedModeCode[]): string {
  if (codes.length === 0) {
    return "";
  }
  return codes.map((c) => DEGRADED_MODE_LABELS[c]).join(" · ");
}

export interface ProfileTrait {
  id: string;
  label: string;
  source: "manual" | "behavior" | "llm";
  suppressed: boolean;
}

export interface CorrectionRecord {
  traitId: string;
  action: "suppress" | "restore" | "manual_override";
  at: string;
  note?: string;
}

export interface ProfileCorrectionState {
  traits: ProfileTrait[];
  corrections: CorrectionRecord[];
  suppressionList: string[];
}

export function createEmptyCorrectionState(): ProfileCorrectionState {
  return { traits: [], corrections: [], suppressionList: [] };
}

export function seedTraitsFromProfile(profile: UserModeProfile): ProfileTrait[] {
  const traits: ProfileTrait[] = [
    {
      id: `mode-${profile.primaryMode}`,
      label: userModeLabel(profile.primaryMode),
      source: "llm",
      suppressed: false,
    },
  ];
  for (const mode of profile.secondaryModes) {
    traits.push({
      id: `mode-${mode}`,
      label: userModeLabel(mode),
      source: "llm",
      suppressed: false,
    });
  }
  if (profile.recentIntent) {
    traits.push({
      id: "recent-intent",
      label: profile.recentIntent,
      source: "behavior",
      suppressed: false,
    });
  }
  return traits;
}

export function userModeLabel(mode: UserMode): string {
  const labels: Record<UserMode, string> = {
    tech_tracker: "技术追踪者",
    learner: "学习者",
    creator_researcher: "创作者/研究者",
    founder_project: "创业者/项目型",
    personal_memory: "个人记忆/生活型",
  };
  return labels[mode];
}

/** Trust priority: manual > behavior > LLM */
export function applyProfileCorrection(
  state: ProfileCorrectionState,
  traitId: string,
  action: "suppress" | "restore" | "manual_override",
  note?: string,
): ProfileCorrectionState {
  const at = new Date().toISOString();
  const corrections: CorrectionRecord[] = [
    ...state.corrections,
    { traitId, action, at, note },
  ];
  let suppressionList = [...state.suppressionList];
  const traits = state.traits.map((t) => {
    if (t.id !== traitId) {
      return t;
    }
    if (action === "suppress") {
      suppressionList = [...suppressionList, traitId];
      return { ...t, suppressed: true, source: "manual" as const };
    }
    if (action === "restore") {
      suppressionList = suppressionList.filter((id) => id !== traitId);
      return { ...t, suppressed: false };
    }
    return { ...t, source: "manual" as const, suppressed: false };
  });

  return { traits, corrections, suppressionList };
}

export function isTraitVisible(state: ProfileCorrectionState, traitId: string): boolean {
  return !state.suppressionList.includes(traitId);
}

export function applyCorrectionToProfile(
  profile: UserModeProfile,
  state: ProfileCorrectionState,
): UserModeProfile {
  const primaryTrait = state.traits.find((t) => t.id === `mode-${profile.primaryMode}`);
  if (primaryTrait?.suppressed) {
    const fallback = state.traits.find((t) => !t.suppressed && t.id.startsWith("mode-"));
    if (fallback) {
      const mode = fallback.id.replace("mode-", "") as UserMode;
      return {
        ...profile,
        primaryMode: mode,
        lastCorrectionAt: new Date().toISOString(),
        confidence: Math.max(profile.confidence, 0.85),
      };
    }
  }
  return profile;
}
