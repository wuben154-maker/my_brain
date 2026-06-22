import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import type { UserModeProfile } from "../domain/userMode.js";
import {
  degradedBannerText,
  type DegradedModeState,
  userModeLabel,
} from "../profile/correctionHistory.js";

export interface LivingHomeEntryLine {
  text: string;
  signalIndex?: number;
  degraded: boolean;
}

export interface LivingHomeEntry {
  headline: string;
  lines: LivingHomeEntryLine[];
  degradedBanner: string;
}

function greetingForProfile(profile: UserModeProfile): string {
  const mode = userModeLabel(profile.primaryMode);
  if (profile.recentIntent?.trim()) {
    return `你好，${mode} · ${profile.recentIntent.trim()}`;
  }
  return `你好，${mode}`;
}

function intentLabel(intent: AdaptiveSignal["suggestedIntent"]): string {
  const labels: Record<AdaptiveSignal["suggestedIntent"], string> = {
    explain_more: "值得深入聊聊",
    capture: "可先捕获整理",
    ingest_candidate: "可作为入库候选",
  };
  return labels[intent];
}

function sourceHint(sourceType: AdaptiveSignal["sourceType"]): string {
  const labels: Record<AdaptiveSignal["sourceType"], string> = {
    radar: "雷达",
    capture: "捕获",
    learning: "学习",
    project: "项目",
    memory: "记忆",
  };
  return labels[sourceType];
}

/** Build personalized LivingBrainHome daily entry lines from real signals. */
export function buildLivingHomeEntry(
  profile: UserModeProfile,
  signals: AdaptiveSignal[],
  degraded: DegradedModeState,
): LivingHomeEntry {
  const isDegraded = degraded.providerMode !== "live" || degraded.active.length > 0;
  const ranked = [...signals].sort((a, b) => b.freshness - a.freshness);
  const lines: LivingHomeEntryLine[] = ranked.slice(0, 3).map((signal, index) => ({
    text: `${sourceHint(signal.sourceType)}入口 · ${intentLabel(signal.suggestedIntent)}（置信 ${Math.round(signal.confidence * 100)}%）`,
    signalIndex: index,
    degraded: isDegraded,
  }));

  if (lines.length === 0) {
    lines.push({
      text:
        profile.recentIntent?.trim() ||
        `今日从「${userModeLabel(profile.primaryMode)}」模式开始，等待你的第一条信号。`,
      degraded: isDegraded,
    });
  }

  return {
    headline: greetingForProfile(profile),
    lines,
    degradedBanner: isDegraded ? degradedBannerText(degraded.active) : "",
  };
}
