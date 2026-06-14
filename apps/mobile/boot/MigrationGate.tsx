import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

export interface MigrationGateProps {
  status: "boot" | "migrating" | "migration_error";
  schemaVersion?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
}

/** Blocks LivingBrainHome until migrations succeed (M2 hard gate). */
export function MigrationGate({
  status,
  schemaVersion,
  errorMessage,
  onRetry,
}: MigrationGateProps) {
  if (status === "migration_error") {
    return (
      <View style={styles.root} testID="migration-error-screen">
        <Text style={styles.title}>数据库迁移失败</Text>
        <Text style={styles.body}>
          {errorMessage ?? "SchemaMigrationError"} · schema v{schemaVersion ?? "?"}
        </Text>
        <Pressable style={styles.cta} onPress={onRetry} testID="migration-retry">
          <Text style={styles.ctaText}>重试迁移</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="migration-gate-screen">
      <Text style={styles.title}>
        {status === "boot" ? "启动中" : "正在迁移本地数据库"}
      </Text>
      <Text style={styles.body}>MigrationGate · schema v{schemaVersion ?? "…"}</Text>
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
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
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
});
