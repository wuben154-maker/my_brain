import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { brainTheme, spacing, typography, type ThemeMode } from "../../theme/tokens";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  themeMode?: ThemeMode;
  /** Contract layout: left-aligned title at x≈24 matching UI PNG baselines. */
  variant?: "default" | "contract";
  testID?: string;
}

export function PageHeader({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  themeMode = "dark",
  variant = "default",
  testID = "page-header",
}: PageHeaderProps) {
  const theme = brainTheme[themeMode];
  const isContract = variant === "contract";

  if (isContract) {
    return (
      <View style={styles.contractWrap} testID={testID} accessibilityRole="header">
        {leftSlot ? <View style={styles.contractLeft}>{leftSlot}</View> : null}
        <Text
          style={[styles.contractTitle, { color: theme.text }]}
          testID={`${testID}-title`}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.contractSubtitle, { color: theme.textSecondary }]}
            testID={`${testID}-subtitle`}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.row} testID={testID} accessibilityRole="header">
      <View style={styles.side}>{leftSlot}</View>
      <View style={styles.center}>
        <Text
          style={[styles.title, { color: theme.text }]}
          testID={`${testID}-title`}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            testID={`${testID}-subtitle`}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.side}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  contractWrap: {
    paddingHorizontal: 24,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  contractLeft: {
    marginBottom: spacing.xs,
  },
  contractTitle: {
    ...typography.title,
    textAlign: "left",
  },
  contractSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: "left",
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  side: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    textAlign: "center",
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
