import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { GlassCard } from "../components/ui/GlassCard";
import { PageHeader } from "../components/ui/PageHeader";
import { ProviderConnectionRow } from "../components/ProviderConnectionRow";
import { TestConnectionButton } from "../components/TestConnectionButton";
import { readMobileAppEnv } from "../env/readAppEnv";
import { BackButton } from "../navigation/BackButton";
import { useNavigation } from "../navigation/NavigationContext";
import {
  appendProviderConfigAudit,
  deriveProviderSnapshotFromSettings,
  loadProviderSettings,
  saveProviderSettings,
  testExecutionApiConnection,
  testLlmConnection,
  testRadarConnection,
  testTokenExchangeConnection,
  testVoiceConnection,
  verifyCompanionProviderGate,
  type ConnectionTestResult,
  type ProviderSettingsConfig,
} from "../services/providerConfigStore";
import {
  getSecureCredentialStore,
  maskCredentialLast4,
} from "../services/secureCredentialStore";
import { validateProviderHttpsUrl } from "../services/providerUrlValidation";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useTheme } from "../theme/ThemeProvider";
import { brainTheme, safeArea, spacing, typography } from "../theme/tokens";
import { isVisualFixtureRoute } from "../visual-fixtures/captureSession";

type BlockId = "llm" | "voice" | "radar" | "tokenExchange" | "executionApi";

export interface ProviderSettingsScreenProps {
  /** First-launch gate — blocks main route until both live checks pass. */
  launchGate?: boolean;
}

export function ProviderSettingsScreen(props: ProviderSettingsScreenProps) {
  if (props.launchGate) {
    return <ProviderSettingsScreenInner {...props} onBack={() => undefined} showBack={false} />;
  }
  return <ProviderSettingsScreenWithNav {...props} />;
}

function ProviderSettingsScreenWithNav(props: ProviderSettingsScreenProps) {
  const { goBack } = useNavigation();
  return <ProviderSettingsScreenInner {...props} onBack={goBack} showBack />;
}

function ProviderSettingsScreenInner({
  launchGate = false,
  onBack,
  showBack,
}: ProviderSettingsScreenProps & { onBack: () => void; showBack: boolean }) {
  const { mode, colors } = useTheme();
  const theme = brainTheme[mode];
  const providerVisualCapture = isVisualFixtureRoute("ProviderSettings");
  const voiceDisconnected = useMobileAppStore((s) =>
    s.degraded.active.includes("voice_disconnected"),
  );

  const [settings, setSettings] = useState<ProviderSettingsConfig>(() => loadProviderSettings());
  const [llmKeyLast4, setLlmKeyLast4] = useState<string | null>(null);
  const [voiceKeyLast4, setVoiceKeyLast4] = useState<string | null>(null);
  const [llmKeyDraft, setLlmKeyDraft] = useState("");
  const [voiceKeyDraft, setVoiceKeyDraft] = useState("");
  const [results, setResults] = useState<Partial<Record<BlockId, ConnectionTestResult>>>({});
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const providerVerified = useMobileAppStore((s) => s.providerVerified);
  const applyProviderVerification = useMobileAppStore((s) => s.applyProviderVerification);

  const shellEnv = useMemo(() => readMobileAppEnv(), []);

  useEffect(() => {
    void (async () => {
      const store = getSecureCredentialStore();
      setLlmKeyLast4(await store.getLast4("llm_api_key"));
      setVoiceKeyLast4(await store.getLast4("voice_api_key"));
    })();
  }, []);

  const syncStoreStatus = useCallback(
    (next: ProviderSettingsConfig, hasLlm: boolean, hasVoice: boolean) => {
      const snapshot = deriveProviderSnapshotFromSettings(
        next,
        hasLlm,
        hasVoice,
        voiceDisconnected,
      );
      useMobileAppStore.setState({ hasApiKey: hasLlm, providerStatus: snapshot });
    },
    [voiceDisconnected],
  );

  const syncVoiceConnectionResult = useCallback(
    (result: ConnectionTestResult, hasKey: boolean) => {
      useMobileAppStore.setState((state) => {
        const voiceLive = result.status === "live";
        const llmLive = state.providerLlmLive;
        const verified = llmLive && voiceLive;
        return {
          hasApiKey: hasKey || state.hasApiKey,
          providerStatus: {
            ...state.providerStatus,
            voice:
              result.status === "live"
                ? "connected"
                : result.status === "mock"
                  ? "mock"
                  : "disconnected",
            lastErrorCode: result.status === "live" ? undefined : result.code,
          },
          providerVoiceLive: voiceLive,
          providerVerified: verified,
          providerLlmLive: llmLive,
        };
      });
      const next = useMobileAppStore.getState();
      applyProviderVerification({
        verified: next.providerVerified,
        llmLive: next.providerLlmLive,
        voiceLive: next.providerVoiceLive,
      });
    },
    [applyProviderVerification],
  );

  const syncLlmConnectionResult = useCallback(
    (result: ConnectionTestResult, hasKey: boolean) => {
      useMobileAppStore.setState((state) => {
        const llmLive = result.status === "live";
        const voiceLive = state.providerVoiceLive;
        const verified = llmLive && voiceLive;
        return {
          hasApiKey: hasKey,
          providerStatus: {
            ...state.providerStatus,
            llm:
              result.status === "live"
                ? "live"
                : result.status === "mock"
                  ? "mock"
                  : "degraded",
            lastErrorCode: result.status === "live" ? undefined : result.code,
          },
          providerLlmLive: llmLive,
          providerVerified: verified,
          providerVoiceLive: voiceLive,
        };
      });
      const next = useMobileAppStore.getState();
      applyProviderVerification({
        verified: next.providerVerified,
        llmLive: next.providerLlmLive,
        voiceLive: next.providerVoiceLive,
      });
    },
    [applyProviderVerification],
  );

  const persistSettings = useCallback(
    (next: ProviderSettingsConfig, auditField: string) => {
      saveProviderSettings(next);
      setSettings(next);
      appendProviderConfigAudit(auditField, "ok", "provider_settings_saved");
      void (async () => {
        const store = getSecureCredentialStore();
        const hasLlm = await store.has("llm_api_key");
        const hasVoice = await store.has("voice_api_key");
        syncStoreStatus(next, hasLlm, hasVoice);
      })();
    },
    [syncStoreStatus],
  );

  const saveLlmKey = useCallback(async () => {
    if (!llmKeyDraft.trim()) {
      return;
    }
    const store = getSecureCredentialStore();
    await store.set("llm_api_key", llmKeyDraft.trim());
    setLlmKeyDraft("");
    const last4 = await store.getLast4("llm_api_key");
    setLlmKeyLast4(last4);
    appendProviderConfigAudit("llm_api_key", "ok", "credential_configured");
    syncStoreStatus(settings, true, await store.has("voice_api_key"));
  }, [llmKeyDraft, settings, syncStoreStatus]);

  const saveVoiceKey = useCallback(async () => {
    if (!voiceKeyDraft.trim()) {
      return;
    }
    const store = getSecureCredentialStore();
    await store.set("voice_api_key", voiceKeyDraft.trim());
    setVoiceKeyDraft("");
    const last4 = await store.getLast4("voice_api_key");
    setVoiceKeyLast4(last4);
    appendProviderConfigAudit("voice_api_key", "ok", "credential_configured");
    syncStoreStatus(settings, await store.has("llm_api_key"), true);
  }, [voiceKeyDraft, settings, syncStoreStatus]);

  const setResult = useCallback((block: BlockId, result: ConnectionTestResult) => {
    setResults((prev) => ({ ...prev, [block]: result }));
  }, []);

  const runLaunchGateVerification = useCallback(async () => {
    const store = getSecureCredentialStore();
    const gate = await verifyCompanionProviderGate({
      settings,
      llmHasKey: await store.has("llm_api_key"),
      llmApiKey: await store.get("llm_api_key"),
      voiceHasKey: await store.has("voice_api_key"),
      voiceApiKey: await store.get("voice_api_key"),
      voiceDisconnected,
    });
    setResult("llm", gate.llm);
    setResult("voice", gate.voice);
    syncLlmConnectionResult(gate.llm, await store.has("llm_api_key"));
    syncVoiceConnectionResult(gate.voice, await store.has("voice_api_key"));
    applyProviderVerification(gate.verification);
    if (gate.verification.verified) {
      setGateMessage("ModelScope 与豆包语音均已连接，可进入主界面。");
    } else {
      setGateMessage("需要 ModelScope 语言模型与豆包语音均检测为已连接，主界面仍锁定。");
    }
    return gate;
  }, [
    applyProviderVerification,
    settings,
    syncLlmConnectionResult,
    syncVoiceConnectionResult,
    voiceDisconnected,
  ]);

  const handleBack = useCallback(() => onBack(), [onBack]);

  const mergedTokenUrl =
    settings.tokenExchange.baseUrl.trim() ||
    shellEnv.tokenExchangeUrl ||
    "";

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      testID={providerVisualCapture ? "screen-provider-settings" : "provider-settings-screen"}
    >
      <PageHeader
        variant={providerVisualCapture ? "contract" : "default"}
        title={providerVisualCapture || !launchGate ? "连接与模型" : "Provider Setup"}
        subtitle={
          providerVisualCapture
            ? "密钥只存本机；未测试成功前不会显示为已连接。"
            : launchGate
              ? "配置并验证 ModelScope 与豆包语音后再进入主界面"
              : "密钥、语音与智能服务"
        }
        themeMode={mode}
        leftSlot={
          showBack ? (
            <BackButton onPress={handleBack} testID="provider-settings-back" />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} testID="provider-settings-scroll">
        {launchGate ? (
          <GlassCard themeMode={mode} testID="provider-launch-gate-banner" style={styles.banner}>
            <Text style={[styles.bannerText, { color: theme.warning }]}>
              首次启动需完成 Provider Setup。未完成 ModelScope 与豆包语音 live 检测前，不会进入 LivingBrainHome、Today 或雷达。
            </Text>
            {gateMessage ? (
              <Text style={[styles.bannerText, { color: theme.textSecondary, marginTop: spacing.xs }]}>
                {gateMessage}
              </Text>
            ) : null}
            {providerVerified ? (
              <Text style={[styles.bannerText, { color: theme.primary, marginTop: spacing.xs }]}>
                已通过 live 检测 — 主界面已解锁。
              </Text>
            ) : null}
          </GlassCard>
        ) : null}
        <GlassCard themeMode={mode} testID="provider-settings-mock-banner" style={styles.banner}>
          <Text style={[styles.bannerText, { color: theme.warning }]}>
            {providerVisualCapture
              ? "Doubao / ModelScope 直连；连接状态始终可见，测试失败不会显示「已连接」。"
              : "连接状态始终可见；部分能力为演示或降级时也会如实说明，测试失败不会显示「已连接」。"}
          </Text>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>语言模型</Text>
        <ProviderConnectionRow
          title="语言模型"
          subtitle={`${settings.llm.providerId} · ${settings.llm.model}`}
          result={results.llm ?? null}
          themeMode={mode}
          testID="provider-row-llm"
        />
        <TextInput
          testID="provider-llm-endpoint"
          value={settings.llm.endpoint}
          onChangeText={(endpoint) =>
            setSettings((s) => ({ ...s, llm: { ...s.llm, endpoint } }))
          }
          onBlur={() => persistSettings(settings, "llm.endpoint")}
          placeholder="服务地址（不含密钥）"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <Text style={[styles.keyLabel, { color: theme.textSecondary }]} testID="provider-llm-key-mask">
          API Key：{maskCredentialLast4(llmKeyLast4)}
        </Text>
        <TextInput
          testID="provider-llm-key-input"
          value={llmKeyDraft}
          onChangeText={setLlmKeyDraft}
          secureTextEntry
          placeholder="粘贴 API Key（仅保存在本机）"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <Pressable testID="provider-llm-key-save" onPress={() => void saveLlmKey()} style={styles.saveKey}>
          <Text style={{ color: theme.primary }}>保存 Key</Text>
        </Pressable>
        <TestConnectionButton
          testID="test-connection-llm"
          themeMode={mode}
          onTest={async () => {
            const store = getSecureCredentialStore();
            const hasKey = await store.has("llm_api_key");
            const apiKey = hasKey ? await store.get("llm_api_key") : null;
            const result = await testLlmConnection(settings.llm, { hasKey, apiKey });
            syncLlmConnectionResult(result, hasKey);
            return result;
          }}
          onResult={(r) => setResult("llm", r)}
        />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>语音服务</Text>
        <ProviderConnectionRow
          title="豆包语音"
          subtitle={`${settings.voice.providerId} · ${settings.voice.region}`}
          result={results.voice ?? null}
          themeMode={mode}
          testID="provider-row-voice"
        />
        <TextInput
          testID="provider-voice-app-id"
          value={settings.voice.appId ?? ""}
          onChangeText={(appId) =>
            setSettings((s) => ({ ...s, voice: { ...s.voice, appId } }))
          }
          onBlur={() => persistSettings(settings, "voice.appId")}
          placeholder="豆包 App ID（X-Api-App-ID）"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <Text style={[styles.keyLabel, { color: theme.textSecondary }]} testID="provider-voice-key-mask">
          语音 Key：{maskCredentialLast4(voiceKeyLast4)}
        </Text>
        <TextInput
          testID="provider-voice-key-input"
          value={voiceKeyDraft}
          onChangeText={setVoiceKeyDraft}
          secureTextEntry
          placeholder="粘贴语音 API Key（仅保存在本机）"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <Pressable
          testID="provider-voice-key-save"
          onPress={() => void saveVoiceKey()}
          style={styles.saveKey}
        >
          <Text style={{ color: theme.primary }}>保存语音 Key</Text>
        </Pressable>
        <TestConnectionButton
          testID="test-connection-voice"
          themeMode={mode}
          onTest={async () => {
            const store = getSecureCredentialStore();
            const hasKey = await store.has("voice_api_key");
            const result = await testVoiceConnection(
              settings.voice,
              hasKey,
              voiceDisconnected,
              { apiKey: await store.get("voice_api_key") },
            );
            syncVoiceConnectionResult(result, hasKey);
            return result;
          }}
          onResult={(r) => setResult("voice", r)}
        />

        {launchGate ? (
          <TestConnectionButton
            testID="provider-launch-gate-verify"
            label="检测全部并继续"
            themeMode={mode}
            onTest={async () => {
              const gate = await runLaunchGateVerification();
              return gate.verification.verified
                ? { status: "live" as const, hint: "主界面已解锁" }
                : {
                    status: "error" as const,
                    code: "PROVIDER_GATE_BLOCKED",
                    hint: "需要 ModelScope 与豆包语音均 live 成功",
                  };
            }}
            onResult={() => undefined}
          />
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>新闻与趋势</Text>
        <ProviderConnectionRow
          title="今日入口数据源"
          subtitle={`间隔 ${settings.radar.fetchIntervalMinutes} 分钟`}
          result={results.radar ?? null}
          themeMode={mode}
          testID="provider-row-radar"
        />
        <TestConnectionButton
          testID="test-connection-radar"
          themeMode={mode}
          onTest={async () => testRadarConnection(settings.radar)}
          onResult={(r) => setResult("radar", r)}
        />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>短期凭证交换（可选）</Text>
        <GlassCard themeMode={mode} testID="provider-token-exchange-byok-note" style={styles.banner}>
          <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
            个人 BYOK 模式不需要 Token BFF；直连 LLM/语音 Key 即可。下列配置仅在企业或托管部署时使用。
          </Text>
        </GlassCard>
        <ProviderConnectionRow
          title="短期凭证交换"
          subtitle="个人模式可跳过 · 仅 HTTPS"
          result={results.tokenExchange ?? null}
          themeMode={mode}
          testID="provider-row-token-exchange"
        />
        <TextInput
          testID="provider-token-exchange-url"
          value={settings.tokenExchange.baseUrl}
          onChangeText={(baseUrl) =>
            setSettings((s) => ({
              ...s,
              tokenExchange: { ...s.tokenExchange, baseUrl },
            }))
          }
          onBlur={() => {
            const url = settings.tokenExchange.baseUrl.trim();
            if (url) {
              const v = validateProviderHttpsUrl(url);
              if (!v.ok) {
                setResult("tokenExchange", {
                  status: "error",
                  code: v.code ?? "TokenExchangeError",
                  hint: v.hint,
                });
                return;
              }
            }
            persistSettings(settings, "tokenExchange.baseUrl");
          }}
          placeholder="https://your-bff.example/token"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <TestConnectionButton
          testID="test-connection-token-exchange"
          themeMode={mode}
          onTest={async () =>
            testTokenExchangeConnection({
              ...settings.tokenExchange,
              baseUrl: mergedTokenUrl,
            })
          }
          onResult={(r) => setResult("tokenExchange", r)}
        />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>行动执行</Text>
        <ProviderConnectionRow
          title="行动执行服务"
          subtitle="仅配置与测试连接（默认关闭）"
          result={results.executionApi ?? null}
          themeMode={mode}
          testID="provider-row-execution-api"
        />
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: theme.text }]}>启用行动执行服务</Text>
          <Switch
            testID="provider-execution-api-enabled"
            value={settings.executionApi.enabled}
            onValueChange={(enabled) => {
              const next = {
                ...settings,
                executionApi: { ...settings.executionApi, enabled },
              };
              persistSettings(next, "executionApi.enabled");
            }}
          />
        </View>
        <TextInput
          testID="provider-execution-api-url"
          value={settings.executionApi.baseUrl}
          onChangeText={(baseUrl) =>
            setSettings((s) => ({
              ...s,
              executionApi: { ...s.executionApi, baseUrl },
            }))
          }
          onBlur={() => persistSettings(settings, "executionApi.baseUrl")}
          placeholder="https://你的执行服务.example"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <TestConnectionButton
          testID="test-connection-execution-api"
          themeMode={mode}
          onTest={async () => testExecutionApiConnection(settings.executionApi)}
          onResult={(r) => setResult("executionApi", r)}
        />
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  banner: {
    marginBottom: spacing.md,
  },
  bannerText: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 15,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    minHeight: 44,
  },
  keyLabel: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  saveKey: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    minHeight: 44,
    marginBottom: spacing.xs,
  },
  switchLabel: {
    ...typography.body,
  },
});
