import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "./ui/GlassCard";
import { brainTheme, radius, spacing, typography, type ThemeMode } from "../theme/tokens";

export interface SettingsSectionProps {
  title: string;
  subtitle: string;
  accentColor: string;
  onPress?: () => void;
  trailing?: ReactNode;
  themeMode?: ThemeMode;
  testID?: string;
  accessibilityLabel?: string;
}

export function SettingsSection({
  title,
  subtitle,
  accentColor,
  onPress,
  trailing,
  themeMode = "dark",
  testID = "settings-section",
  accessibilityLabel,
}: SettingsSectionProps) {
  const theme = brainTheme[themeMode];
  const label = accessibilityLabel ?? title;

  const body = (
    <GlassCard themeMode={themeMode} style={styles.card} testID={testID}>
      <View style={styles.row}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]} testID={`${testID}-title`}>
            {title}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            testID={`${testID}-subtitle`}
          >
            {subtitle}
          </Text>
        </View>
        {trailing ?? (
          <Text style={[styles.chevron, { color: theme.textTertiary }]} testID={`${testID}-chevron`}>
            ›
          </Text>
        )}
      </View>
    </GlassCard>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return body;
}

const SECTION_RADIUS = 18;

const styles = StyleSheet.create({
  card: {
    padding: 0,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: SECTION_RADIUS,
    marginBottom: spacing.md,
    minHeight: 56,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  accent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  textBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.9,
  },
});
