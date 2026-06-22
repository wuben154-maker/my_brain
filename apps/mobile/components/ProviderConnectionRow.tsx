import { StyleSheet, Text, View } from "react-native";

import type { ConnectionTestResult } from "../services/providerConfigStore";
import { brainTheme, radius, spacing, typography, type ThemeMode } from "../theme/tokens";

export interface ProviderConnectionRowProps {
  title: string;
  subtitle?: string;
  result: ConnectionTestResult | null;
  themeMode?: ThemeMode;
  testID?: string;
}

function statusColor(
  status: ConnectionTestResult["status"] | undefined,
  theme: (typeof brainTheme)[ThemeMode],
): string {
  if (status === "live") {
    return theme.success;
  }
  if (status === "error") {
    return theme.error;
  }
  return theme.warning;
}

function statusLabel(status: ConnectionTestResult["status"] | undefined): string {
  if (status === "live") {
    return "已连接";
  }
  if (status === "mock") {
    return "演示模式";
  }
  if (status === "degraded") {
    return "部分可用";
  }
  if (status === "error") {
    return "连接失败";
  }
  return "未测试";
}

export function ProviderConnectionRow({
  title,
  subtitle,
  result,
  themeMode = "dark",
  testID = "provider-connection-row",
}: ProviderConnectionRowProps) {
  const theme = brainTheme[themeMode];
  const tint = statusColor(result?.status, theme);

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} testID={`${testID}-title`}>
          {title}
        </Text>
        <Text
          style={[styles.badge, { color: tint, borderColor: tint }]}
          testID={`${testID}-status`}
          accessibilityLiveRegion="polite"
        >
          {statusLabel(result?.status)}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]} testID={`${testID}-subtitle`}>
          {subtitle}
        </Text>
      ) : null}
      {result?.endpointSummary ? (
        <Text
          style={[styles.endpoint, { color: theme.textTertiary }]}
          testID={`${testID}-endpoint`}
        >
          {result.endpointSummary}
        </Text>
      ) : null}
      {result?.code ? (
        <Text style={[styles.code, { color: theme.error }]} testID={`${testID}-error-code`}>
          {result.code}
          {result.hint ? ` · ${result.hint}` : ""}
        </Text>
      ) : result?.hint && result.status !== "error" ? (
        <Text style={[styles.hint, { color: tint }]} testID={`${testID}-hint`}>
          {result.hint}
        </Text>
      ) : null}
      {result?.status === "error" && result.hint ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]} testID={`${testID}-error-hint`}>
          {result.hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: "500",
    flex: 1,
  },
  badge: {
    ...typography.caption,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  endpoint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  code: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
