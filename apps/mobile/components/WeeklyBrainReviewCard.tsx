import { StyleSheet, Text, View } from "react-native";

import type { GraphChangeRecord, GraphNode, LearningTraceRecord, WeeklyReviewDraft } from "@my-brain/core";
import { graphChangeRef, learningTraceRef } from "@my-brain/core";

import { GlassCard } from "./ui/GlassCard";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

export interface WeeklyBrainReviewPreview {
  visible: boolean;
  headline: string;
  summary: string;
  nextStep: string;
  evidenceRefs: string[];
  degraded: boolean;
  stats: {
    activeNodes: number;
    weekChanges: number;
    learningTraces: number;
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isWithinLastWeek(isoDate: string, nowMs: number): boolean {
  const at = Date.parse(isoDate);
  if (Number.isNaN(at)) {
    return false;
  }
  return nowMs - at <= WEEK_MS;
}

export function buildWeeklyBrainReviewPreview(input: {
  nodes: GraphNode[];
  changes: GraphChangeRecord[];
  learningTraces: LearningTraceRecord[];
  degraded?: boolean;
  now?: number;
}): WeeklyBrainReviewPreview {
  const nowMs = input.now ?? Date.now();
  const activeNodes = input.nodes.filter((node) => !node.archived);
  const weekChanges = input.changes.filter(
    (change) => !change.undone && isWithinLastWeek(change.createdAt, nowMs),
  );
  const weekTraces = input.learningTraces.filter((trace) =>
    isWithinLastWeek(trace.createdAt, nowMs),
  );

  const evidenceRefs: string[] = [];
  for (const change of weekChanges.slice(0, 3)) {
    evidenceRefs.push(graphChangeRef(change.id));
  }
  for (const trace of weekTraces.slice(0, 2)) {
    evidenceRefs.push(learningTraceRef(trace.id));
  }

  const degraded = input.degraded ?? false;
  const visible = activeNodes.length > 0 || weekChanges.length > 0 || weekTraces.length > 0;

  if (!visible) {
    return {
      visible: false,
      headline: "本周还没有可回顾的成长",
      summary: "先聊几条、确认入库后，这里会引用真实图谱变化。",
      nextStep: "从首页语音聊聊，或随手记一条候选。",
      evidenceRefs: [],
      degraded: true,
      stats: {
        activeNodes: activeNodes.length,
        weekChanges: weekChanges.length,
        learningTraces: weekTraces.length,
      },
    };
  }

  const latestChange = weekChanges[weekChanges.length - 1];
  const headline =
    weekChanges.length > 0
      ? `本周 ${weekChanges.length} 次图谱整理`
      : `图谱里已有 ${activeNodes.length} 个概念`;

  const summaryParts: string[] = [];
  if (weekChanges.length > 0) {
    summaryParts.push(`${weekChanges.length} 次结构变更`);
  }
  if (weekTraces.length > 0) {
    summaryParts.push(`${weekTraces.length} 条学习痕迹`);
  }
  if (activeNodes.length > 0) {
    summaryParts.push(`${activeNodes.length} 个活跃概念`);
  }

  const nextStep = latestChange
    ? `下一步：继续跟进「${latestChange.summary.slice(0, 24)}」`
    : weekTraces[0]
      ? `下一步：回到「${weekTraces[0]!.topic.slice(0, 24)}」深聊`
      : "下一步：挑一个概念，用语音多说点";

  return {
    visible: true,
    headline,
    summary: summaryParts.join(" · "),
    nextStep,
    evidenceRefs,
    degraded,
    stats: {
      activeNodes: activeNodes.length,
      weekChanges: weekChanges.length,
      learningTraces: weekTraces.length,
    },
  };
}

function formatEvidenceCaption(refs: string[]): string {
  if (refs.length === 0) {
    return "暂无证据来源";
  }
  const preview = refs.slice(0, 2).join(" · ");
  return refs.length > 2 ? `来源 ${preview} 等 ${refs.length} 条` : `来源 ${preview}`;
}

export interface WeeklyBrainReviewCardProps {
  preview: WeeklyBrainReviewPreview;
  profileDraft?: WeeklyReviewDraft | null;
  themeMode?: ThemeMode;
  testID?: string;
}

export function WeeklyBrainReviewCard({
  preview,
  profileDraft = null,
  themeMode = "dark",
  testID = "weekly-brain-review",
}: WeeklyBrainReviewCardProps) {
  const theme = brainTheme[themeMode];
  const empty = !preview.visible && preview.evidenceRefs.length === 0;

  return (
    <GlassCard
      themeMode={themeMode}
      testID={testID}
      style={styles.card}
      accessibilityLabel="本周回顾"
    >
      <Text style={[styles.sectionLabel, { color: theme.primary }]} testID={`${testID}-label`}>
        本周回顾
      </Text>

      {empty ? (
        <View testID={`${testID}-empty`}>
          <Text style={[styles.headline, { color: theme.text }]}>{preview.headline}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{preview.summary}</Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]}>
            演示模式 · 尚无本周证据
          </Text>
        </View>
      ) : (
        <View testID={`${testID}-content`}>
          <Text style={[styles.headline, { color: theme.text }]} testID={`${testID}-headline`}>
            {preview.headline}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]} testID={`${testID}-summary`}>
            {preview.summary}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]} testID={`${testID}-next`}>
            {preview.nextStep}
          </Text>
          {profileDraft ? (
            <View testID={`${testID}-profile-draft`}>
              <Text style={[styles.draftBadge, { color: theme.warning, borderColor: `${theme.warning}66` }]}>
                {profileDraft.title} · 草稿
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]} testID={`${testID}-profile-summary`}>
                {profileDraft.summary}
              </Text>
              {profileDraft.highlights.map((line) => (
                <Text
                  key={line}
                  style={[styles.body, { color: theme.textSecondary }]}
                  testID={`${testID}-profile-highlight`}
                >
                  · {line}
                </Text>
              ))}
            </View>
          ) : null}
          {preview.degraded ? (
            <Text style={[styles.degraded, { color: theme.warning }]} testID={`${testID}-degraded`}>
              证据可能不完整（演示模式）
            </Text>
          ) : null}
          <Text style={[styles.caption, { color: theme.textTertiary }]} testID={`${testID}-evidence`}>
            {formatEvidenceCaption(preview.evidenceRefs)}
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
  body: {
    ...typography.caption,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  degraded: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  draftBadge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  caption: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
