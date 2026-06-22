import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

export interface MigrationGateProps {
  status: "boot" | "migrating" | "migration_error";
  schemaVersion?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
}

function userFacingMigrationError(errorMessage?: string | null): string {
  if (!errorMessage?.trim()) {
    return "本地数据库升级时出现问题，请重试。";
  }
  const trimmed = errorMessage.trim();
  if (/SchemaMigration|MigrationGate|Error$/i.test(trimmed)) {
    return "本地数据库升级时出现问题，请重试。若反复失败，可在设置中导出诊断摘要。";
  }
  return trimmed;
}

/** Blocks LivingBrainHome until migrations succeed (M2 hard gate). */
export function MigrationGate({
  status,
  schemaVersion,
  errorMessage,
  onRetry,
}: MigrationGateProps) {
  const schemaTestId =
    schemaVersion != null ? `migration-schema-v${schemaVersion}` : "migration-schema-unknown";

  if (status === "migration_error") {
    return (
      <View style={styles.root} testID="migration-error-screen">
        <Text style={styles.title}>暂时无法打开</Text>
        <Text style={styles.body}>{userFacingMigrationError(errorMessage)}</Text>
        <View testID={schemaTestId} style={styles.schemaProbe} />
        <Pressable style={styles.cta} onPress={onRetry} testID="migration-retry">
          <Text style={styles.ctaText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="migration-gate-screen">
      <Text style={styles.title}>
        {status === "boot" ? "正在准备你的本地大脑" : "正在整理本地记忆"}
      </Text>
      <Text style={styles.body}>
        {status === "boot"
          ? "首次启动可能需要片刻，请稍候。"
          : "升级本地数据库结构，不会删除你的记忆内容。"}
      </Text>
      <View testID={schemaTestId} style={styles.schemaProbe} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "600",
  },
  schemaProbe: {
    width: 0,
    height: 0,
    opacity: 0,
  },
});
