import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { userModeLabel, PROVIDER_STATUS_TEST_IDS } from "@my-brain/core";

import { collectAndShareIosBackupEvidence } from "../diagnostics/collectIosBackupEvidence";

import { AdaptiveRadar } from "../components/AdaptiveRadar";
import { ColdStartDialogue } from "./ColdStartDialogue";
import { DegradedModeBanner } from "../components/DegradedModeBanner";
import { IntentRail } from "../components/IntentRail";
import { MemoryCore } from "../components/MemoryCore";
import { MemoryWeather } from "../components/MemoryWeather";
import { ProfileReview } from "../components/ProfileReview";
import { ProvisionalQueueSheet } from "../components/ProvisionalQueueSheet";
import { QuickCaptureFab } from "../components/QuickCaptureFab";
import { useConversationSession } from "../hooks/useConversationSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { colors, copy } from "../theme/tokens";

export function SettingsScreen() {
  const degraded = useMobileAppStore((s) => s.degraded);
  const profile = useMobileAppStore((s) => s.userProfile);
  const hasApiKey = useMobileAppStore((s) => s.hasApiKey);
  const setHasApiKey = useMobileAppStore((s) => s.setHasApiKey);
  const closeSettings = useMobileAppStore((s) => s.closeSettings);
  const profileReviewOpen = useMobileAppStore((s) => s.profileReviewOpen);
  const openProfileReview = useMobileAppStore((s) => s.openProfileReview);
  const providerStatus = useMobileAppStore((s) => s.providerStatus);
  const persistWarnings = useMobileAppStore((s) => s.persistWarnings);
  const [iosEvidenceMessage, setIosEvidenceMessage] = useState<string | null>(null);

  const onCollectIosBackupEvidence = useCallback(async () => {
    setIosEvidenceMessage("正在读取 NSURLIsExcludedFromBackupKey…");
    try {
      const result = await collectAndShareIosBackupEvidence();
      setIosEvidenceMessage(result.message);
    } catch (e) {
      setIosEvidenceMessage(e instanceof Error ? e.message : "采集失败");
    }
  }, []);

  return (
    <View style={styles.settings} testID="settings-screen">
      <Text style={styles.settingsTitle}>设置</Text>
      <Text style={styles.settingsSection}>Provider 状态面板</Text>
      <View testID="provider-status-panel">
        <Text style={styles.settingsRow} testID={PROVIDER_STATUS_TEST_IDS.llm}>
          LLM：{providerStatus.llm}
        </Text>
        <Text style={styles.settingsRow} testID={PROVIDER_STATUS_TEST_IDS.radar}>
          Radar：{providerStatus.radar}
        </Text>
        <Text style={styles.settingsRow} testID={PROVIDER_STATUS_TEST_IDS.voice}>
          Voice：{providerStatus.voice}
        </Text>
        <Text style={styles.settingsRow} testID={PROVIDER_STATUS_TEST_IDS.storage}>
          Storage：{providerStatus.storage}
        </Text>
      </View>
      {providerStatus.lastErrorCode ? (
        <Text style={styles.settingsRow} testID="provider-config-error">
          ProviderConfigError：{providerStatus.lastErrorCode}
        </Text>
      ) : null}
      {persistWarnings.length > 0 ? (
        <Text style={styles.settingsRow} testID="persist-warning-banner">
          持久化警告：{persistWarnings.join(", ")}
        </Text>
      ) : null}
      <Text style={styles.settingsSection}>API 与 Provider</Text>
      <Text style={styles.settingsRow}>
        运行模式：{degraded.providerMode === "mock" ? "演示" : "已连接"}
      </Text>
      <Pressable
        onPress={() => setHasApiKey(!hasApiKey)}
        style={styles.toggle}
        testID="settings-toggle-api-key"
      >
        <Text style={styles.toggleText}>
          {hasApiKey ? "已配置 API Key（演示切换）" : "未配置 API Key · mock"}
        </Text>
      </Pressable>
      {profile ? (
        <Text style={styles.settingsRow}>
          用户模式：{userModeLabel(profile.primaryMode)}
        </Text>
      ) : null}
      <Pressable onPress={openProfileReview} testID="settings-open-profile-review">
        <Text style={styles.link}>画像与纠偏</Text>
      </Pressable>
      {profileReviewOpen ? <ProfileReview /> : null}
      {Platform.OS === "ios" ? (
        <>
          <Text style={styles.settingsSection}>M2 诊断（Dev Client）</Text>
          <Text style={styles.settingsRow}>
            采集 mybrain.db / -wal / -shm 的 NSURLIsExcludedFromBackupKey 并分享 JSON 证据。
          </Text>
          <Pressable
            onPress={() => {
              void onCollectIosBackupEvidence();
            }}
            style={styles.toggle}
            testID="settings-collect-ios-backup-evidence"
          >
            <Text style={styles.toggleText}>生成 iOS 备份排除证据</Text>
          </Pressable>
          {iosEvidenceMessage ? (
            <Text style={styles.settingsRow} testID="ios-backup-evidence-status">
              {iosEvidenceMessage}
            </Text>
          ) : null}
        </>
      ) : null}
      <Pressable onPress={closeSettings} style={styles.closeSettings}>
        <Text style={styles.closeSettingsText}>返回</Text>
      </Pressable>
    </View>
  );
}

export function LivingBrainHome() {
  const phase = useMobileAppStore((s) => s.phase);
  const startColdStart = useMobileAppStore((s) => s.startColdStart);
  const signals = useMobileAppStore((s) => s.signals);
  const visibleNodes = useMobileAppStore((s) => s.visibleNodes);
  const weatherHeadline = useMobileAppStore((s) => s.weatherHeadline);
  const degraded = useMobileAppStore((s) => s.degraded);
  const settingsOpen = useMobileAppStore((s) => s.settingsOpen);
  const openSettings = useMobileAppStore((s) => s.openSettings);
  const lastIngestSummary = useMobileAppStore((s) => s.lastIngestSummary);
  const { focusSignal, dispatchIntent, undoLastChange } = useConversationSession();

  if (settingsOpen) {
    return <SettingsScreen />;
  }

  return (
    <View style={styles.root} testID="living-brain-home">
      <View style={styles.header}>
        <Text style={styles.brand}>my_brain</Text>
        <Pressable onPress={openSettings} testID="settings-entry">
          <Text style={styles.menu}>···</Text>
        </Pressable>
      </View>

      <DegradedModeBanner codes={degraded.active} />

      <ScrollView style={styles.scroll}>
        <MemoryCore nodes={visibleNodes} />

        {phase === "empty_invite" ? (
          <View style={styles.invite} testID="home-empty-invite">
            <Text style={styles.hero}>{copy.home.emptyTitle}</Text>
            <Text style={styles.body}>{copy.home.emptyBody}</Text>
            <Pressable style={styles.cta} onPress={startColdStart} testID="start-cold-start">
              <Text style={styles.ctaText}>{copy.home.startChat}</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === "cold_start" ? <ColdStartDialogue /> : null}

        {phase === "adaptive_live" ? (
          <>
            <MemoryWeather headline={weatherHeadline || "记忆在呼吸"} />
            <AdaptiveRadar signals={signals} onSelect={focusSignal} />
            {lastIngestSummary ? (
              <Text style={styles.ingestSummary} testID="ingest-summary">
                {lastIngestSummary}
              </Text>
            ) : null}
            <Pressable onPress={() => undoLastChange()} testID="graph-undo">
              <Text style={styles.undo}>撤销上次图谱整理</Text>
            </Pressable>
            <IntentRail onIntent={dispatchIntent} />
          </>
        ) : null}
      </ScrollView>

      {phase === "adaptive_live" ? <QuickCaptureFab /> : null}
      <ProvisionalQueueSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  brand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
  },
  menu: {
    color: colors.textMuted,
    fontSize: 22,
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  invite: {
    padding: 24,
    alignItems: "center",
  },
  hero: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  ingestSummary: {
    color: colors.success,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 4,
  },
  undo: {
    color: colors.primary,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  settings: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  settingsTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },
  settingsSection: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  settingsRow: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 8,
  },
  toggle: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleText: {
    color: colors.text,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    marginVertical: 12,
  },
  closeSettings: {
    marginTop: 24,
    padding: 12,
  },
  closeSettingsText: {
    color: colors.textMuted,
  },
});
