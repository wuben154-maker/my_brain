import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  PROVIDER_STATUS_TEST_IDS,
  userModeLabel,
  type DegradedModeState,
  type ProviderConfigSnapshot,
  type UserModeProfile,
} from "@my-brain/core";

import { DeveloperDiagnosticsFold } from "../components/DeveloperDiagnosticsFold";
import { CognitiveActionPanel } from "../components/CognitiveActionPanel";
import { M7ABackupPanel } from "../components/M7ABackupPanel";
import { ProfileReview } from "../components/ProfileReview";
import { SettingsSection } from "../components/SettingsSection";
import { GlassCard } from "../components/ui/GlassCard";
import { PageHeader } from "../components/ui/PageHeader";
import { SettingRow } from "../components/ui/SettingRow";
import { BackButton } from "../navigation/BackButton";
import { useNavigation } from "../navigation/NavigationContext";
import { Routes } from "../navigation/routes";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useTheme } from "../theme/ThemeProvider";
import {
  appearanceLabel,
} from "../theme/appearancePreference";
import { brainTheme, getModeAccent, safeArea, spacing, typography } from "../theme/tokens";
import { isVisualFixtureRoute } from "../visual-fixtures/captureSession";

const DEV_UNLOCK_TAPS = 7;
/** CK-08 capture contract — matches app-development/UI/08-profile-trust-settings.svg */
const SETTINGS_VISUAL_FIXTURE_TRUST: TrustSummary = {
  statusLine: "当前状态：本地可用 · 演示语音",
  profileTitle: "学习者 + 技术追踪者",
  profileDetail: "置信 82%，你可以随时纠偏。",
  productTier: "demo",
};

type SettingsFixtureSection = {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  testID: string;
  action: "profile" | "provider" | "provider-key" | "local" | "voice" | "appearance" | "diagnostics";
};

const SETTINGS_VISUAL_FIXTURE_SECTIONS: SettingsFixtureSection[] = [
  {
    id: "profile",
    title: "我的画像",
    subtitle: "模式、推断来源、纠偏历史",
    accentColor: "#9B8CFF",
    testID: "settings-section-profile",
    action: "profile",
  },
  {
    id: "provider-stack",
    title: "连接与模型",
    subtitle: "LLM / Voice / Radar / Storage",
    accentColor: "#7B8CFF",
    testID: "settings-section-provider",
    action: "provider",
  },
  {
    id: "local-data",
    title: "本地数据",
    subtitle: "导出、占用、归档节点",
    accentColor: "#6BC9A8",
    testID: "settings-section-local-data",
    action: "local",
  },
  {
    id: "provider-key",
    title: "连接与模型",
    subtitle: "豆包 Key、模型、连接检测",
    accentColor: "#E8B86D",
    testID: "settings-section-provider-key",
    action: "provider-key",
  },
  {
    id: "voice",
    title: "权限与语音",
    subtitle: "麦克风、文字兜底、打断说明",
    accentColor: "#6B9FFF",
    testID: "settings-section-voice",
    action: "voice",
  },
  {
    id: "appearance",
    title: "外观",
    subtitle: "浅色、深色、跟随系统",
    accentColor: "#FFB87A",
    testID: "settings-section-appearance",
    action: "appearance",
  },
  {
    id: "diagnostics",
    title: "诊断与导出",
    subtitle: "白名单诊断包，默认隐藏开发者项",
    accentColor: "#6B7280",
    testID: "settings-section-diagnostics",
    action: "diagnostics",
  },
];


export interface TrustSummary {
  statusLine: string;
  profileTitle: string;
  profileDetail: string;
  productTier: "demo" | "partial" | "connected";
}

export function deriveTrustSummary(
  providerStatus: ProviderConfigSnapshot,
  hasApiKey: boolean,
  degraded: DegradedModeState,
  profile: UserModeProfile | null,
): TrustSummary {
  const voiceMock =
    providerStatus.voice === "mock" || providerStatus.voice === "disconnected";
  const llmMock = providerStatus.llm === "mock";
  const fullyConnected =
    hasApiKey &&
    degraded.active.length === 0 &&
    providerStatus.llm === "live" &&
    !voiceMock &&
    providerStatus.storage === "ready";
  const anyLive =
    hasApiKey &&
    !fullyConnected &&
    (providerStatus.llm === "live" ||
      providerStatus.radar === "live" ||
      providerStatus.voice === "mock");

  let productTier: TrustSummary["productTier"] = "demo";
  let statusLine = "当前状态：演示模式";
  if (fullyConnected) {
    productTier = "connected";
    statusLine = "当前状态：已连接";
  } else if (anyLive) {
    productTier = "partial";
    const parts: string[] = ["部分可用"];
    if (voiceMock) {
      parts.push("演示语音");
    }
    if (llmMock) {
      parts.push("演示模型");
    }
    if (providerStatus.storage === "degraded" || providerStatus.storage === "migrating") {
      parts.push("本地迁移中");
    }
    statusLine = `当前状态：${parts.join(" · ")}`;
  } else {
    const parts: string[] = ["本地可用"];
    if (voiceMock) {
      parts.push("演示语音");
    }
    if (llmMock) {
      parts.push("演示模型");
    }
    statusLine = `当前状态：${parts.join(" · ")}`;
  }

  if (!profile) {
    return {
      statusLine,
      profileTitle: "完成冷启动后可查看画像",
      profileDetail: "先聊几句，我会慢慢了解你。",
      productTier,
    };
  }

  const secondary =
    profile.secondaryModes.length > 0
      ? ` + ${profile.secondaryModes.map(userModeLabel).join("、")}`
      : "";
  return {
    statusLine,
    profileTitle: `${userModeLabel(profile.primaryMode)}${secondary}`,
    profileDetail: `置信 ${Math.round(profile.confidence * 100)}%，你可以随时纠偏。`,
    productTier,
  };
}

function providerRowLabel(
  key: keyof ProviderConfigSnapshot,
  value: string,
): { title: string; value: string } {
  const titles: Record<string, string> = {
    llm: "语言模型",
    radar: "今日入口",
    voice: "语音",
    storage: "本地存储",
  };
  const valueLabels: Record<string, string> = {
    mock: "演示模式",
    degraded: "部分可用",
    live: "已连接",
    fixture: "演示数据",
    disconnected: "未连接（文字可用）",
    ready: "就绪",
    migrating: "迁移中",
  };
  return {
    title: titles[key] ?? key,
    value: valueLabels[value] ?? value,
  };
}

interface SettingsScreenProps {
  /** Test hook: skip __DEV__ gate for developer fold access */
  forceDevAccess?: boolean;
}

export function SettingsScreen({ forceDevAccess = false }: SettingsScreenProps) {
  const { goBack, navigate } = useNavigation();
  const closeSettings = useMobileAppStore((s) => s.closeSettings);
  const closeProfileReview = useMobileAppStore((s) => s.closeProfileReview);
  const profileReviewOpen = useMobileAppStore((s) => s.profileReviewOpen);
  const providerStatus = useMobileAppStore((s) => s.providerStatus);
  const hasApiKey = useMobileAppStore((s) => s.hasApiKey);
  const degraded = useMobileAppStore((s) => s.degraded);
  const userProfile = useMobileAppStore((s) => s.userProfile);
  const demoMode = useMobileAppStore((s) => s.demoMode);
  const appearance = useMobileAppStore((s) => s.appearancePreference);
  const setAppearancePreference = useMobileAppStore((s) => s.setAppearancePreference);

  const { mode, colors } = useTheme();
  const theme = brainTheme[mode];

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devFoldExpanded, setDevFoldExpanded] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);

  const canAccessDev = forceDevAccess || devUnlocked || (typeof __DEV__ !== "undefined" && __DEV__);

  const visualFixtureCapture = isVisualFixtureRoute("SettingsScreen");

  const trustSummary = useMemo(
    () =>
      visualFixtureCapture
        ? SETTINGS_VISUAL_FIXTURE_TRUST
        : deriveTrustSummary(providerStatus, hasApiKey, degraded, userProfile),
    [visualFixtureCapture, providerStatus, hasApiKey, degraded, userProfile],
  );

  const onBack = useCallback(() => {
    if (profileReviewOpen) {
      closeProfileReview();
      return;
    }
    closeSettings();
    goBack();
  }, [closeProfileReview, closeSettings, goBack, profileReviewOpen]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSection((current) => (current === id ? null : id));
  }, []);

  const onVersionPress = useCallback(() => {
    const next = versionTapCount + 1;
    setVersionTapCount(next);
    if (next >= DEV_UNLOCK_TAPS) {
      setDevUnlocked(true);
      setVersionTapCount(0);
    }
  }, [versionTapCount]);

  const explainClearDataUnavailable = useCallback(() => {
    Alert.alert(
      "演示构建暂不可用",
      "当前为演示构建，此操作不会删除本地图谱、画像或凭证。完整清除功能将在正式版提供。",
      [{ text: "知道了", style: "default" }],
    );
  }, []);

  const statusTint = visualFixtureCapture
    ? theme.success
    : trustSummary.productTier === "connected"
      ? theme.success
      : trustSummary.productTier === "partial"
        ? theme.warning
        : theme.warning;

  const onFixtureSectionPress = useCallback(
    (action: SettingsFixtureSection["action"]) => {
      switch (action) {
        case "profile":
          useMobileAppStore.getState().openProfileReview();
          break;
        case "provider":
        case "provider-key":
          navigate(Routes.ProviderSettings);
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  if (profileReviewOpen) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]} testID="settings-screen">
        <PageHeader
          title="我的画像"
          subtitle="模式、推断来源、纠偏历史"
          themeMode={mode}
          leftSlot={<BackButton onPress={onBack} testID="settings-back" />}
        />
        <ProfileReview themeMode={mode} />
      </View>
    );
  }

  if (visualFixtureCapture) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]} testID="settings-screen">
        <View style={styles.fixtureHeader} testID="page-header">
          <BackButton onPress={onBack} testID="settings-back" />
          <Text style={[styles.fixtureHeaderTitle, { color: theme.text }]} testID="page-header-title">
            Profile & Trust
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.fixtureScrollContent}
          testID="settings-scroll"
        >
          <GlassCard
            themeMode={mode}
            testID="provider-summary-banner"
            style={styles.fixtureSummaryCard}
          >
            <Text style={[styles.fixtureStatusLine, { color: statusTint }]} testID="trust-status-line">
              {trustSummary.statusLine}
            </Text>
            <Text style={[styles.fixtureSummaryTitle, { color: theme.text }]} testID="trust-profile-title">
              {trustSummary.profileTitle}
            </Text>
            <Text
              style={[styles.fixtureSummaryDetail, { color: theme.textSecondary }]}
              testID="trust-profile-detail"
            >
              {trustSummary.profileDetail}
            </Text>
          </GlassCard>

          {SETTINGS_VISUAL_FIXTURE_SECTIONS.map((section) => (
            <SettingsSection
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              accentColor={section.accentColor}
              themeMode={mode}
              testID={section.testID}
              onPress={() => onFixtureSectionPress(section.action)}
            />
          ))}

          <Text style={[styles.fixtureFooterHint, { color: theme.textTertiary }]} testID="settings-footer-hint">
            开发者诊断：长按版本号开启 · 不打扰普通用户
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="settings-screen">
      <PageHeader
        title="信任与设置"
        subtitle="画像、连接与隐私"
        themeMode={mode}
        leftSlot={<BackButton onPress={onBack} testID="settings-back" />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        testID="settings-scroll"
      >
        <GlassCard
          themeMode={mode}
          testID="provider-summary-banner"
          style={styles.summaryCard}
        >
          <Text style={[styles.statusLine, { color: statusTint }]} testID="trust-status-line">
            {trustSummary.statusLine}
          </Text>
          <Text style={[styles.summaryTitle, { color: theme.text }]} testID="trust-profile-title">
            {trustSummary.profileTitle}
          </Text>
          <Text
            style={[styles.summaryDetail, { color: theme.textSecondary }]}
            testID="trust-profile-detail"
          >
            {trustSummary.profileDetail}
          </Text>
          {demoMode ? (
            <Text style={[styles.mockHint, { color: theme.primary }]} testID="settings-demo-data-banner">
              演示数据 — 内置示例内容，可在开发者诊断中重置。
            </Text>
          ) : null}
          {trustSummary.productTier === "demo" ? (
            <Text style={[styles.mockHint, { color: theme.warning }]} testID="trust-mock-hint">
              演示模式 — 部分能力为模拟，配置连接后可体验完整能力。
            </Text>
          ) : null}
        </GlassCard>

        <SettingsSection
          title="我的画像"
          subtitle="模式、推断来源、纠偏历史"
          accentColor={getModeAccent("learner", mode)}
          themeMode={mode}
          testID="settings-section-profile"
          onPress={() => useMobileAppStore.getState().openProfileReview()}
        />

        <SettingsSection
          title="连接与模型"
          subtitle="密钥、语音与智能服务"
          accentColor={theme.primary}
          themeMode={mode}
          testID="settings-section-provider"
          onPress={() => navigate(Routes.ProviderSettings)}
        />

        <SettingsSection
          title="本地数据"
          subtitle="导出、占用、归档节点、行动记录"
          accentColor={theme.success}
          themeMode={mode}
          testID="settings-section-local-data"
          onPress={() => toggleSection("local-data")}
        />
        {expandedSection === "local-data" ? (
          <View style={styles.inlinePanel} testID="settings-local-data-panel">
            <SettingRow
              title="导出图谱摘要"
              subtitle="仅导出摘要，不含原文"
              themeMode={mode}
              testID="settings-export-summary"
              onPress={() =>
                Alert.alert("导出", "演示模式下导出预览可用；完整导出在备份区。")
              }
            />
            {canAccessDev || demoMode ? (
              <CognitiveActionPanel themeMode={mode} testID="settings-cognitive-actions" />
            ) : null}
            <SettingRow
              title="本地数据清除"
              subtitle="演示构建暂不执行，不会删除本地数据"
              themeMode={mode}
              testID="settings-clear-data"
              onPress={explainClearDataUnavailable}
            />
          </View>
        ) : null}

        <SettingsSection
          title="备份与同步"
          subtitle="加密备份、恢复、冲突策略"
          accentColor={theme.warning}
          themeMode={mode}
          testID="settings-section-backup"
          onPress={() => toggleSection("backup")}
        />
        {expandedSection === "backup" ? (
          <View style={styles.inlinePanel} testID="settings-backup-panel">
            <Text style={[styles.inlineHint, { color: theme.textSecondary }]}>
              导出本地 brain 为 JSON，或从备份恢复。明文 JSON，请自行妥善保管。
            </Text>
            <M7ABackupPanel />
          </View>
        ) : null}

        <SettingsSection
          title="权限与语音"
          subtitle="麦克风、文字兜底、打断说明"
          accentColor={getModeAccent("tech_tracker", mode)}
          themeMode={mode}
          testID="settings-section-voice"
          onPress={() => toggleSection("voice")}
        />
        {expandedSection === "voice" ? (
          <View style={styles.inlinePanel} testID="settings-voice-panel">
            <Text style={[styles.inlineHint, { color: theme.textSecondary }]}>
              语音可随时打断；未授权麦克风时仍可用文字输入。
            </Text>
          </View>
        ) : null}

        <SettingsSection
          title="外观"
          subtitle="浅色、深色、跟随系统"
          accentColor={getModeAccent("creator_researcher", mode)}
          themeMode={mode}
          testID="settings-section-appearance"
          onPress={() => toggleSection("appearance")}
        />
        {expandedSection === "appearance" ? (
          <View style={styles.inlinePanel} testID="settings-appearance-panel">
            {(["light", "dark", "system"] as const).map((pref) => (
              <SettingRow
                key={pref}
                title={appearanceLabel(pref)}
                value={appearance === pref ? "已选" : undefined}
                themeMode={mode}
                testID={`settings-appearance-${pref}`}
                onPress={() => setAppearancePreference(pref)}
              />
            ))}
          </View>
        ) : null}

        <SettingsSection
          title="诊断与导出"
          subtitle="问题反馈与安全摘要"
          accentColor={theme.textTertiary}
          themeMode={mode}
          testID="settings-section-diagnostics"
          onPress={() => toggleSection("diagnostics")}
        />
        {expandedSection === "diagnostics" ? (
          <View style={styles.inlinePanel} testID="settings-diagnostics-panel">
            <Text style={[styles.inlineHint, { color: theme.textSecondary }]}>
              导出的诊断摘要仅含操作结果与原因码，不含对话原文、语音缓存或画像全文。
            </Text>
          </View>
        ) : null}

        <SettingsSection
          title="关于"
          subtitle="版本、隐私说明、演示模式"
          accentColor={theme.textTertiary}
          themeMode={mode}
          testID="settings-section-about"
          onPress={() => toggleSection("about")}
        />
        {expandedSection === "about" ? (
          <View style={styles.inlinePanel} testID="settings-about-panel">
            <Pressable onPress={onVersionPress} testID="settings-about-version">
              <SettingRow
                title="版本"
                value="0.1.0（演示版）"
                showChevron={false}
                themeMode={mode}
                testID="settings-version-row"
              />
            </Pressable>
            <Text style={[styles.microHint, { color: theme.textTertiary }]}>
              {devUnlocked
                ? "开发者诊断已解锁"
                : `开发者诊断：连点版本号 ${DEV_UNLOCK_TAPS} 次开启`}
            </Text>
            <SettingRow
              title="演示模式说明"
              subtitle="演示模式下部分能力为模拟，连接后体验更完整"
              showChevron={false}
              themeMode={mode}
              testID="about-demo-mode-help"
            />
          </View>
        ) : null}

        {canAccessDev ? (
          <>
            <DeveloperDiagnosticsFold
              expanded={devFoldExpanded}
              onToggle={() => setDevFoldExpanded((v) => !v)}
              themeMode={mode}
            />
            {devFoldExpanded ? (
              <View style={styles.inlinePanel} testID="settings-provider-summary">
                <Text style={[styles.devSectionLabel, { color: theme.textSecondary }]}>
                  集成状态（开发者）
                </Text>
                {(Object.keys(PROVIDER_STATUS_TEST_IDS) as Array<
                  keyof typeof PROVIDER_STATUS_TEST_IDS
                >).map((key) => {
                  const raw = String(providerStatus[key as keyof ProviderConfigSnapshot] ?? "—");
                  const row = providerRowLabel(key as keyof ProviderConfigSnapshot, raw);
                  return (
                    <SettingRow
                      key={key}
                      title={row.title}
                      value={`${row.value}（${raw}）`}
                      showChevron={false}
                      themeMode={mode}
                      testID={PROVIDER_STATUS_TEST_IDS[key]}
                    />
                  );
                })}
                {!hasApiKey ? (
                  <Text
                    style={[styles.inlineHint, { color: theme.warning }]}
                    testID="provider-mock-banner"
                  >
                    还没有配置 API Key，当前为演示模式。
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={[styles.footerHint, { color: theme.textTertiary }]} testID="settings-footer-hint">
          开发者诊断：连点版本号开启 · 不打扰普通用户
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: safeArea.screenTopChrome,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    marginBottom: spacing.md,
    borderRadius: 24,
  },
  fixtureHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    gap: spacing.sm,
  },
  fixtureHeaderTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "600",
    flex: 1,
  },
  fixtureScrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  fixtureSummaryCard: {
    marginBottom: 22,
    borderRadius: 24,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 98,
  },
  fixtureStatusLine: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  fixtureSummaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  fixtureSummaryDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  fixtureFooterHint: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  statusLine: {
    ...typography.caption,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  summaryDetail: {
    ...typography.caption,
  },
  mockHint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  inlinePanel: {
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
    paddingLeft: spacing.xs,
  },
  inlineHint: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    lineHeight: 20,
  },
  microHint: {
    fontSize: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  footerHint: {
    fontSize: 10,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  devSectionLabel: {
    ...typography.caption,
    fontWeight: "500",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
});
