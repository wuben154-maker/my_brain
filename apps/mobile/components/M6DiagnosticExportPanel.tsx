import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  buildDiagnosticExportPayload,
  type DiagnosticExportStatus,
} from "../diagnostics/exportDiagnostics";
import { colors } from "../theme/tokens";

export function M6DiagnosticExportPanel() {
  const [status, setStatus] = useState<DiagnosticExportStatus>({ state: "idle" });

  const onPreview = useCallback(() => {
    const result = buildDiagnosticExportPayload();
    if (!result.ok) {
      setStatus(result.status);
      return;
    }
    setStatus({
      state: "ready",
      message: `预览通过：${result.eventCount} 条事件，JSON ${result.json.length} 字节（白名单字段）。`,
    });
  }, []);

  const onExport = useCallback(async () => {
    const result = buildDiagnosticExportPayload();
    if (!result.ok) {
      setStatus(result.status);
      return;
    }
    const { Share } = await import("react-native");
    await Share.share({
      message: result.json,
      title: "mybrain-diagnostic-export.json",
    });
    setStatus({
      state: "ready",
      message: `已分享 ${result.eventCount} 条诊断事件（不含敏感正文）。`,
    });
  }, []);

  return (
    <View style={styles.panel} testID="m6-diagnostic-export-panel">
      <Text style={styles.section}>M6 本地诊断导出</Text>
      <Text style={styles.mockBanner} testID="m6-diagnostic-mock-banner">
        mock/degraded 安全：仅 intent/outcome/reasonCode + 版本/路由；无图谱正文/transcript/画像。
      </Text>
      <Text style={styles.hint} testID="m6-diagnostic-status">
        {status.state === "idle"
          ? "可导出 ring buffer 白名单事件供 QA。"
          : status.message}
      </Text>
      <Pressable onPress={onPreview} style={styles.button} testID="m6-diagnostic-preview">
        <Text style={styles.buttonText}>扫描导出白名单</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void onExport();
        }}
        style={styles.button}
        testID="m6-diagnostic-export"
      >
        <Text style={styles.buttonText}>分享诊断 JSON</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  mockBanner: {
    color: colors.accent,
    fontSize: 12,
    marginBottom: 8,
  },
  hint: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
});
