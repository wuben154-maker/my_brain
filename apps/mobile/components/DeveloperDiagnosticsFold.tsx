import { Pressable, StyleSheet, Text, View } from "react-native";

import { M3VoiceDiagnosticsPanel } from "./M3VoiceDiagnosticsPanel";
import { M4SharePayloadDiagnosticsPanel } from "./M4SharePayloadDiagnosticsPanel";
import { M6DiagnosticExportPanel } from "./M6DiagnosticExportPanel";
import { M7BSyncPanel } from "./M7BSyncPanel";
import { DemoResetDevButton } from "../demo/DemoResetDevButton";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

interface Props {
  expanded: boolean;
  onToggle: () => void;
  themeMode?: ThemeMode;
  testID?: string;
}

const GATE_STATUS_LINES = [
  "M0–M2：PASS",
  "M3：NEEDS_DEVICE_EVIDENCE",
  "M4：mock / prep（待真机证据）",
  "M5：mock-first PASS（UI 聚合）",
  "M6：导出白名单（无 ring buffer 正文）",
  "M7A/B：prep — 备份/同步 gate 未全部 PASS",
] as const;

export function DeveloperDiagnosticsFold({
  expanded,
  onToggle,
  themeMode = "dark",
  testID = "developer-diagnostics-fold",
}: Props) {
  const theme = brainTheme[themeMode];

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="开发者诊断"
        testID="developer-diagnostics-toggle"
        style={styles.toggleRow}
      >
        <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>
          开发者诊断 {expanded ? "▾" : "▸"}
        </Text>
      </Pressable>

      {expanded ? (
        <View testID="m3-diagnostics" style={styles.panelStack}>
          <Text style={[styles.gateHonesty, { color: theme.warning }]} testID="dev-gate-status">
            Gate 状态（工程视角，非用户文案）：
          </Text>
          {GATE_STATUS_LINES.map((line) => (
            <Text
              key={line}
              style={[styles.gateLine, { color: theme.textSecondary }]}
              testID={`dev-gate-${line.slice(0, 3)}`}
            >
              {line}
            </Text>
          ))}
          <DemoResetDevButton themeMode={themeMode} />
          <M3VoiceDiagnosticsPanel />
          <M4SharePayloadDiagnosticsPanel />
          <M6DiagnosticExportPanel />
          <Text
            style={[styles.gateLine, { color: theme.textSecondary }]}
            testID="dev-backup-handoff-hint"
          >
            备份/恢复已移至设置 → 备份与同步。
          </Text>
          <M7BSyncPanel />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    ...typography.caption,
    textAlign: "center",
  },
  panelStack: {
    gap: spacing.sm,
  },
  gateHonesty: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  gateLine: {
    ...typography.caption,
    marginBottom: 2,
  },
});
