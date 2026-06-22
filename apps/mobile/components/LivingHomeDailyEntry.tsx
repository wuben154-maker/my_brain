import { StyleSheet, Text, View } from "react-native";

import type { LivingHomeEntry } from "@my-brain/core";

import { brainTheme, spacing, type ThemeMode } from "../theme/tokens";

export interface LivingHomeDailyEntryProps {
  entry: LivingHomeEntry;
  themeMode?: ThemeMode;
  testID?: string;
}

export function LivingHomeDailyEntry({
  entry,
  themeMode = "dark",
  testID = "home-daily-entry",
}: LivingHomeDailyEntryProps) {
  const theme = brainTheme[themeMode];

  return (
    <View style={styles.wrap} testID={testID}>
      {entry.lines.map((line, index) => (
        <View
          key={index}
          style={styles.lineRow}
          testID={
            line.degraded
              ? `home-daily-entry-line-${index}-degraded`
              : `home-daily-entry-line-${index}`
          }
        >
          <Text style={[styles.line, { color: theme.textSecondary }]}>
            {line.text}
            {line.degraded ? " · 演示" : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  lineRow: {
    paddingVertical: 2,
  },
  line: {
    fontSize: 14,
    lineHeight: 20,
  },
});
