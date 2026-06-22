import { StyleSheet, Text, View } from "react-native";

import type { MemoryWeatherResult } from "@my-brain/core";

import { GlassCard } from "../components/ui/GlassCard";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

interface Props {
  weather: MemoryWeatherResult | null;
  animationsEnabled?: boolean;
  themeMode?: ThemeMode;
  testID?: string;
}

function formatEvidenceCaption(refs: string[]): string {
  if (refs.length === 0) {
    return "暂无证据来源";
  }
  const preview = refs.slice(0, 2).join(" · ");
  return refs.length > 2 ? `来源 ${preview} 等 ${refs.length} 条` : `来源 ${preview}`;
}

export function MemoryWeather({
  weather,
  animationsEnabled = true,
  themeMode = "dark",
  testID = "memory-weather",
}: Props) {
  const theme = brainTheme[themeMode];
  const hasContent = Boolean(weather?.visible && weather.cards.length > 0);
  const primary = hasContent ? weather!.cards[0]! : null;

  return (
    <GlassCard themeMode={themeMode} testID={testID} style={styles.card}>
      <Text style={[styles.sectionLabel, { color: theme.accent }]} testID={`${testID}-label`}>
        记忆天气
      </Text>

      {!hasContent || !primary ? (
        <View testID={`${testID}-empty`}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            还没有足够的证据生成记忆天气
          </Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]}>
            聊几条、确认入库后，这里会汇总你的学习轨迹
          </Text>
        </View>
      ) : (
        <View testID={`${testID}-content`}>
          <Text style={[styles.headline, { color: theme.text }]} testID={`${testID}-headline`}>
            {primary.headline}
          </Text>
          <Text style={[styles.detail, { color: theme.textSecondary }]} testID={`${testID}-detail`}>
            {primary.detail}
          </Text>
          <Text style={[styles.footnote, { color: theme.textSecondary }]}>
            已记录，可撤销。
          </Text>
          {weather?.degradedReason ? (
            <Text style={[styles.degraded, { color: theme.warning }]} testID={`${testID}-degraded`}>
              证据可能不完整（{weather.degradedReason}）
            </Text>
          ) : null}
          <Text style={[styles.caption, { color: theme.textTertiary }]} testID={`${testID}-evidence`}>
            {formatEvidenceCaption(primary.evidenceRefs)}
            {animationsEnabled ? "" : " · 静态卡片"}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  headline: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  detail: {
    ...typography.caption,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  footnote: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  degraded: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  caption: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
});
