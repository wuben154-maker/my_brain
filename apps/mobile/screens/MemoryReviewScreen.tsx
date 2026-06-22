import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ReviewDraftAction } from "@my-brain/core";

import { ActionPreviewSheet } from "../components/ActionPreviewSheet";
import { DegradedModeBanner } from "../components/DegradedModeBanner";
import { getRecentCurationChanges } from "../components/brainMapModel";
import {
  ReviewDraftActionsCard,
  reviewDraftToCognitiveAction,
} from "../components/ReviewDraftActionsCard";
import { buildMemoryReviewDraftState } from "../components/reviewActionModel";
import {
  buildWeeklyBrainReviewPreview,
  WeeklyBrainReviewCard,
} from "../components/WeeklyBrainReviewCard";
import { PageHeader } from "../components/ui/PageHeader";
import { VoiceOrb } from "../components/ui/VoiceOrb";
import { useCognitiveAction } from "../hooks/useCognitiveAction";
import { MemoryReplay } from "../memory/MemoryReplay";
import { MemoryWeather } from "../memory/MemoryWeather";
import { ReverseQuestion } from "../memory/ReverseQuestion";
import { BackButton } from "../navigation/BackButton";
import { useNavigation } from "../navigation/NavigationContext";
import { useMobileAppStore, selectStorageGraphEmpty } from "../stores/mobileAppStore";
import { useTheme } from "../theme/ThemeProvider";
import { brainTheme, spacing, textOnPrimary, typography } from "../theme/tokens";
import { isVisualFixtureRoute } from "../visual-fixtures/captureSession";
import { GlassCard } from "../components/ui/GlassCard";

export function MemoryReviewScreen() {
  const memoryVisualCapture = isVisualFixtureRoute("MemoryReviewScreen");
  const { goBack } = useNavigation();
  const { mode: themeMode, colors } = useTheme();
  const theme = brainTheme[themeMode];

  const degraded = useMobileAppStore((s) => s.degraded);
  const m5Experiences = useMobileAppStore((s) => s.m5Experiences);
  const graph = useMobileAppStore((s) => s.graph);
  const history = useMobileAppStore((s) => s.history);
  const userProfile = useMobileAppStore((s) => s.userProfile);
  const learningTraces = useMobileAppStore((s) => s.learningTraces);
  const storageReady = useMobileAppStore((s) => s.storageReady);
  const storageGraphEmpty = useMobileAppStore((s) =>
    selectStorageGraphEmpty({
      graph: s.graph,
      history: s.history,
      storageReady: s.storageReady,
    }),
  );
  const refreshM5Experiences = useMobileAppStore((s) => s.refreshM5Experiences);

  const [replayActive, setReplayActive] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(false);
  const cognitiveAction = useCognitiveAction();

  useEffect(() => {
    refreshM5Experiences();
  }, [refreshM5Experiences]);

  const reviewDraftState = useMemo(
    () =>
      buildMemoryReviewDraftState({
        snapshot: graph.getSnapshot(),
        profile: userProfile,
        history: history.listChanges(),
      }),
    [graph, history, userProfile],
  );

  const weeklyPreview = useMemo(
    () =>
      buildWeeklyBrainReviewPreview({
        nodes: graph.getSnapshot().nodes,
        changes: history.listChanges(),
        learningTraces,
        degraded: degraded.active.length > 0,
      }),
    [graph, history, learningTraces, degraded.active.length],
  );

  const recentCurations = useMemo(
    () => getRecentCurationChanges(history.listChanges()),
    [history],
  );

  const handleStartReplay = useCallback(() => {
    setReplayActive((value) => !value);
  }, []);

  const handleGenerateWeekly = useCallback(() => {
    setWeeklyExpanded((value) => !value);
  }, []);

  const handleGenerateReviewDraft = useCallback(
    (action: ReviewDraftAction) => {
      const concepts = graph
        .getSnapshot()
        .nodes.filter((node) => !node.archived)
        .map((node) => node.concept);
      cognitiveAction.startDraft(reviewDraftToCognitiveAction(action), {
        title: action.title,
        summary: action.summary,
        conceptNames: concepts.slice(0, 5),
      });
    },
    [cognitiveAction, graph],
  );

  const voiceOrbState = degraded.active.includes("voice_disconnected") ? "degraded" : "idle";

  if (memoryVisualCapture) {
    return (
      <View
        style={[styles.root, { backgroundColor: colors.background }]}
        testID="memory-review-screen"
      >
        <PageHeader
          title="Memory Review"
          subtitle="不是总结模板，只引用真实图谱变化。"
          themeMode={themeMode}
          variant="contract"
          testID="memory-review-header"
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, styles.fixtureScrollContent]}
          testID="memory-review-scroll"
        >
          <GlassCard themeMode={themeMode} style={styles.fixtureCard} testID="memory-weather-card">
            <Text style={[styles.fixtureTag, { color: theme.accent }]}>MemoryWeather</Text>
            <Text style={[styles.fixtureCardTitle, { color: theme.text }]}>今天是「微光整理」</Text>
            <Text style={[styles.fixtureCardBody, { color: theme.textSecondary }]}>
              你新增 2 个 voice 相关节点，1 次自动连线已记录，可撤销。
            </Text>
          </GlassCard>
          <GlassCard themeMode={themeMode} style={[styles.fixtureCard, styles.fixtureCardGap]} testID="memory-replay-card">
            <Text style={[styles.fixtureTag, { color: theme.primary }]}>MemoryReplay · 最近 7 天</Text>
            <Text style={[styles.fixtureCardBody, { color: theme.textSecondary }]}>点亮「Realtime API」</Text>
            <Text style={[styles.fixtureCardBody, { color: theme.textSecondary }]}>
              合并「语音打断」到 Barge-in
            </Text>
            <Text style={[styles.fixtureCardBody, { color: theme.textSecondary }]}>
              恢复一条项目决策来源
            </Text>
          </GlassCard>
          <GlassCard themeMode={themeMode} style={[styles.fixtureCard, styles.fixtureCardGap]} testID="reverse-question-card">
            <Text style={[styles.fixtureTag, { color: "#FF9EC4" }]}>ReverseQuestion</Text>
            <Text style={[styles.fixtureCardTitle, { color: theme.text }]}>
              如果面试官问：为什么不用普通 RAG？
            </Text>
            <Text style={[styles.fixtureCardBody, { color: theme.textSecondary }]}>
              我可以基于你的图谱追问 5 个角度。
            </Text>
          </GlassCard>
          <GlassCard themeMode={themeMode} style={[styles.fixtureCard, styles.fixtureCardGap]} testID="weekly-brain-review-card">
            <Text style={[styles.fixtureTag, { color: theme.primary }]}>Weekly Brain Review</Text>
            <Text style={[styles.fixtureCardTitle, { color: theme.text }]}>本周你确认了 3 颗新星</Text>
            <Text style={[styles.fixtureCardBody, { color: theme.textSecondary }]}>
              技术追踪者模式占 2/3，语音相关占主导。
            </Text>
          </GlassCard>
          <View style={styles.actions} testID="memory-review-actions">
            <View style={[styles.actionPrimary, { backgroundColor: theme.primaryMuted, borderColor: `${theme.primary}44` }]}>
              <Text style={[styles.actionPrimaryText, { color: theme.primary }]}>开始回放</Text>
            </View>
            <View style={[styles.actionSecondary, { borderColor: theme.border, backgroundColor: `${theme.text}0A` }]}>
              <Text style={[styles.actionSecondaryText, { color: theme.textSecondary }]}>生成周回顾</Text>
            </View>
          </View>
          <Text style={[styles.voiceHint, { color: theme.textSecondary }]}>让我讲给你听</Text>
        </ScrollView>
        <View style={styles.voiceOrbWrap} testID="memory-review-voice-orb">
          <VoiceOrb state={voiceOrbState} themeMode={themeMode} testID="memory-review-voice-orb-core" />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      testID="memory-review-screen"
    >
      <PageHeader
        title="记忆回顾"
        subtitle="不是总结模板，只引用真实图谱变化。"
        themeMode={themeMode}
        leftSlot={<BackButton onPress={goBack} />}
        testID="memory-review-header"
      />

      <DegradedModeBanner codes={degraded.active} testID="memory-review-degraded-banner" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        testID="memory-review-scroll"
      >
        {!storageReady ? (
          <View style={styles.storageHint} testID="memory-review-storage-not-ready">
            <Text style={[styles.storageHintText, { color: theme.textSecondary }]}>
              本地存储还在准备，回顾内容会从已保存的图谱变化里加载。
            </Text>
          </View>
        ) : storageGraphEmpty ? (
          <View style={styles.storageHint} testID="memory-review-storage-empty">
            <Text style={[styles.storageHintText, { color: theme.textSecondary }]}>
              图谱还空着。确认入库后，这里会引用真实的结构变更与学习痕迹。
            </Text>
          </View>
        ) : null}

        {recentCurations.length > 0 ? (
          <GlassCard
            themeMode={themeMode}
            style={styles.fixtureCard}
            testID="memory-curation-history-card"
          >
            <Text style={[styles.fixtureTag, { color: theme.primary }]}>自动整理记录</Text>
            {recentCurations.map((change) => (
              <Text
                key={change.id}
                style={[styles.fixtureCardBody, { color: theme.textSecondary }]}
                testID={`memory-curation-history-${change.id}`}
              >
                {change.summary}
              </Text>
            ))}
            <Text style={[styles.fixtureCardBody, { color: theme.textTertiary }]}>
              已记录，可撤销。
            </Text>
          </GlassCard>
        ) : null}

        <MemoryWeather
          weather={m5Experiences?.weather ?? null}
          animationsEnabled={!replayActive}
          themeMode={themeMode}
        />

        <MemoryReplay
          replay={m5Experiences?.replay ?? null}
          animationsEnabled={!replayActive}
          themeMode={themeMode}
        />

        <ReverseQuestion
          question={m5Experiences?.reverseQuestion ?? null}
          themeMode={themeMode}
        />

        <WeeklyBrainReviewCard
          preview={
            weeklyExpanded
              ? weeklyPreview
              : {
                  ...weeklyPreview,
                  headline: weeklyPreview.visible
                    ? weeklyPreview.headline
                    : "点「生成周回顾」查看成长总结",
                  summary: weeklyPreview.visible
                    ? weeklyPreview.summary
                    : "先聊几条、确认入库后，这里会汇总本周成长。",
                }
          }
          profileDraft={weeklyExpanded ? reviewDraftState.weeklyDraft : null}
          themeMode={themeMode}
        />

        {weeklyExpanded ? (
          <ReviewDraftActionsCard
            actions={reviewDraftState.draftActions}
            themeMode={themeMode}
            onGenerateDraft={handleGenerateReviewDraft}
            testID="memory-review-draft-actions"
          />
        ) : null}

        <View style={styles.actions} testID="memory-review-actions">
          <Pressable
            style={[
              styles.actionPrimary,
              {
                backgroundColor: theme.primaryMuted,
                borderColor: `${theme.primary}44`,
              },
              replayActive && { backgroundColor: theme.primary },
            ]}
            onPress={handleStartReplay}
            testID="memory-review-start-replay"
            accessibilityRole="button"
            accessibilityLabel="开始回放"
          >
            <Text
              style={[
                styles.actionPrimaryText,
                { color: replayActive ? textOnPrimary : theme.primary },
              ]}
            >
              {replayActive ? "回放中…" : "开始回放"}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionSecondary,
              { borderColor: theme.border, backgroundColor: `${theme.text}0A` },
            ]}
            onPress={handleGenerateWeekly}
            testID="memory-review-generate-weekly"
            accessibilityRole="button"
            accessibilityLabel="生成周回顾"
          >
            <Text style={[styles.actionSecondaryText, { color: theme.textSecondary }]}>
              {weeklyExpanded ? "收起周回顾" : "生成周回顾"}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.voiceHint, { color: theme.textSecondary }]}>
          让我讲给你听
        </Text>
      </ScrollView>

      <View style={styles.voiceOrbWrap} testID="memory-review-voice-orb">
        <VoiceOrb state={voiceOrbState} themeMode={themeMode} testID="memory-review-voice-orb-core" />
      </View>

      <ActionPreviewSheet
        visible={cognitiveAction.phase === "preview"}
        draft={cognitiveAction.draft}
        canRemoteExecute={cognitiveAction.canRemoteExecute}
        remoteExecuteDisabledReason={cognitiveAction.remoteExecuteDisabledReason}
        themeMode={themeMode}
        onSaveDraft={cognitiveAction.saveDraftLocally}
        onProceedRemote={cognitiveAction.openConfirmation}
        onCancel={cognitiveAction.cancel}
        testID="memory-review-action-preview"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  storageHint: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  storageHintText: {
    ...typography.caption,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  actionPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionPrimaryText: {
    ...typography.caption,
    fontWeight: "500",
  },
  actionSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionSecondaryText: {
    ...typography.caption,
    fontWeight: "500",
  },
  voiceHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.md,
  },
  voiceOrbWrap: {
    alignItems: "center",
    paddingBottom: spacing.lg,
  },
  fixtureTag: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  fixtureCardTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  fixtureCardBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  fixtureCardGap: {
    marginTop: spacing.md,
  },
  fixtureCard: {
    marginHorizontal: spacing.md,
  },
  fixtureScrollContent: {
    paddingTop: spacing.xs,
  },
});
