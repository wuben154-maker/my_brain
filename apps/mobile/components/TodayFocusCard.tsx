import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AdaptiveSignal, UserMode, UserModeProfile } from "@my-brain/core";
import { userModeLabel } from "@my-brain/core";

import { GlassCard } from "./ui/GlassCard";
import {
  brainTheme,
  copy,
  getModeAccent,
  radius,
  spacing,
  typography,
  type IntentKey,
  type ThemeMode,
} from "../theme/tokens";

export interface TodayFocusViewModel {
  title: string;
  reasonText: string;
  accentMode: UserMode;
  primaryAction: IntentKey;
}

const TITLE_BY_MODE: Record<UserMode, string> = {
  tech_tracker: "今天值得你看的一条",
  learner: "上次聊的概念",
  creator_researcher: "待整理的素材",
  founder_project: "项目里卡住的点",
  personal_memory: "前几天你说过",
};

function reasonForSignal(signal: AdaptiveSignal, profile: UserModeProfile): string {
  const mode = signal.userModeFit;
  if (mode === "tech_tracker" && signal.sourceType === "radar") {
    return "OpenAI 刚开了新模型通道，和你关注的推理成本有关。";
  }
  if (mode === "learner" && signal.sourceType === "learning") {
    return "Transformer 你还想继续吗？我可以从注意力机制讲起。";
  }
  if (mode === "creator_researcher" && signal.sourceType === "capture") {
    return "你前天捕获的段落，要并入「写作系统」吗？";
  }
  if (mode === "founder_project" && signal.sourceType === "project") {
    return "竞品分析那节点三天没动了，要一起推进吗？";
  }
  if (mode === "personal_memory") {
    if (profile.recentIntent) {
      return `${profile.recentIntent.slice(0, 28)}——要记成习惯节点吗？`;
    }
    return "周三你提到想早起跑步——要记成习惯节点吗？";
  }
  return `与${userModeLabel(mode)}画像匹配，置信 ${Math.round(signal.confidence * 100)}%。`;
}

export function buildTodayFocusViewModel(
  signal: AdaptiveSignal | undefined,
  profile: UserModeProfile | null,
): TodayFocusViewModel | null {
  if (!signal || !profile) {
    return null;
  }
  const accentMode = signal.userModeFit;
  return {
    title: TITLE_BY_MODE[accentMode] ?? copy.home.todayFocusFallbackTitle,
    reasonText: reasonForSignal(signal, profile),
    accentMode,
    primaryAction:
      signal.suggestedIntent === "ingest_candidate" ? "ingest" : "detail",
  };
}

export interface TodayFocusCardProps {
  signal: AdaptiveSignal | undefined;
  profile: UserModeProfile | null;
  themeMode?: ThemeMode;
  onPress?: () => void;
  /** @deprecated S10 — use ContextDecisionBar when signal focused */
  onAction?: (intent: IntentKey) => void;
  testID?: string;
}

export function TodayFocusCard({
  signal,
  profile,
  themeMode = "dark",
  onPress,
  testID = "today-focus-card",
}: TodayFocusCardProps) {
  const vm = buildTodayFocusViewModel(signal, profile);
  if (!vm) {
    return null;
  }

  const theme = brainTheme[themeMode];
  const accentColor = getModeAccent(vm.accentMode, themeMode);

  return (
    <GlassCard themeMode={themeMode} style={styles.card} testID={testID}>
      <View style={styles.row}>
        <View
          style={[styles.accentBar, { backgroundColor: accentColor }]}
          testID="today-focus-accent"
        />
        <View style={styles.content}>
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={vm.title}
            testID="today-focus-card-body"
          >
            <Text style={[styles.title, { color: theme.text }]} testID="today-focus-title">
              {vm.title}
            </Text>
            <Text
              style={[styles.reason, { color: theme.textSecondary }]}
              testID="today-focus-reason"
            >
              {vm.reasonText}
            </Text>
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: 0,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },
  reason: {
    ...typography.body,
    lineHeight: 22,
  },
});
