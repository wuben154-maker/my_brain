import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { brainTheme, spacing, typography, type ThemeMode } from "../../theme/tokens";

export interface SectionHeaderProps {
  title: string;
  action?: ReactNode;
  themeMode?: ThemeMode;
  testID?: string;
}

export function SectionHeader({
  title,
  action,
  themeMode = "dark",
  testID = "section-header",
}: SectionHeaderProps) {
  const theme = brainTheme[themeMode];

  return (
    <View style={styles.row} testID={testID}>
      <Text
        style={[styles.title, { color: theme.textSecondary }]}
        testID={`${testID}-title`}
      >
        {title}
      </Text>
      {action ? <View testID={`${testID}-action`}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  title: {
    ...typography.caption,
    textTransform: "none",
  },
});
