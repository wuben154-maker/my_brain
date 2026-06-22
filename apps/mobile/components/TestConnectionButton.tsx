import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import type { ConnectionTestResult } from "../services/providerConfigStore";
import { brainTheme, radius, spacing, typography, type ThemeMode } from "../theme/tokens";

export interface TestConnectionButtonProps {
  label?: string;
  onTest: () => Promise<ConnectionTestResult>;
  onResult: (result: ConnectionTestResult) => void;
  themeMode?: ThemeMode;
  testID?: string;
}

export function TestConnectionButton({
  label = "测试连接",
  onTest,
  onResult,
  themeMode = "dark",
  testID = "test-connection-button",
}: TestConnectionButtonProps) {
  const theme = brainTheme[themeMode];
  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      const result = await onTest();
      onResult(result);
    } catch (error) {
      onResult({
        status: "error",
        code: "CONNECTION_TEST_FAILED",
        hint: error instanceof Error ? error.message : "连接测试失败",
      });
    } finally {
      setLoading(false);
    }
  }, [onTest, onResult]);

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.primaryMuted,
          borderColor: theme.primary,
          opacity: pressed || loading ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.primary} testID={`${testID}-loading`} />
      ) : (
        <Text style={[styles.label, { color: theme.primary }]} testID={`${testID}-label`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  label: {
    ...typography.body,
    fontWeight: "600",
  },
});
