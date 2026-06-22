import { StyleSheet, Text, View } from "react-native";

import type { MemoryReplayFrame, MemoryReplayResult } from "@my-brain/core";

import { GlassCard } from "../components/ui/GlassCard";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

interface Props {
  replay: MemoryReplayResult | null;
  animationsEnabled?: boolean;
  themeMode?: ThemeMode;
  testID?: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TIMELINE_DOT_COLORS = ["#FF8A7A", "#7B8CFF", "#6BC9A8"] as const;

function framesWithinLastWeek(frames: MemoryReplayFrame[], nowMs: number): MemoryReplayFrame[] {
  return frames.filter((frame) => {
    const at = Date.parse(frame.at);
    return !Number.isNaN(at) && nowMs - at <= WEEK_MS;
  });
}

function formatEvidenceCaption(frames: MemoryReplayFrame[]): string {
  const refs = frames.flatMap((frame) => frame.evidenceRefs);
  if (refs.length === 0) {
    return "暂无证据来源";
  }
  const preview = refs.slice(0, 2).join(" · ");
  return refs.length > 2 ? `来源 ${preview} 等 ${refs.length} 条` : `来源 ${preview}`;
}

export function MemoryReplay({
  replay,
  animationsEnabled = true,
  themeMode = "dark",
  testID = "memory-replay",
}: Props) {
  const theme = brainTheme[themeMode];
  const nowMs = Date.now();
  const allFrames = replay?.frames ?? [];
  const weekFrames = framesWithinLastWeek(allFrames, nowMs);
  const hasContent = Boolean(replay?.visible && weekFrames.length > 0);

  return (
    <GlassCard themeMode={themeMode} testID={testID} style={styles.card}>
      <Text style={[styles.sectionLabel, { color: "#9B8CFF" }]} testID={`${testID}-label`}>
        记忆回放 · 最近 7 天
      </Text>

      {!hasContent ? (
        <View testID={`${testID}-empty`}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>还没有可回放的变化</Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]}>
            近 7 天入库或整理后会在这里出现时间线
          </Text>
        </View>
      ) : (
        <View testID={`${testID}-content`}>
          <View
            style={styles.timeline}
            testID={`${testID}-timeline`}
            accessibilityRole="list"
          >
            {weekFrames.slice(0, 5).map((frame, index) => (
              <View
                key={frame.changeId}
                style={styles.timelineRow}
                testID={`${testID}-frame-${index}`}
              >
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: TIMELINE_DOT_COLORS[index % TIMELINE_DOT_COLORS.length] },
                    ]}
                  />
                  {index < Math.min(weekFrames.length, 5) - 1 ? (
                    <View style={[styles.line, { backgroundColor: theme.border }]} />
                  ) : null}
                </View>
                <Text
                  style={[styles.frameText, { color: theme.textSecondary }]}
                  testID={`${testID}-frame-${index}-summary`}
                >
                  {frame.summary}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.meta, { color: theme.textTertiary }]} testID={`${testID}-frame-count`}>
            {weekFrames.length} 条 · {Math.round((replay?.durationMs ?? 0) / 1000)}s
            {animationsEnabled ? "" : " · 静态卡片"}
          </Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]} testID={`${testID}-evidence`}>
            {formatEvidenceCaption(weekFrames)}
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
    marginBottom: spacing.sm,
  },
  timeline: {
    gap: spacing.xs,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 32,
  },
  timelineRail: {
    width: 20,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    width: 1,
    flex: 1,
    minHeight: 16,
    marginTop: 2,
  },
  frameText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 20,
  },
  meta: {
    fontSize: 10,
    marginTop: spacing.sm,
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
