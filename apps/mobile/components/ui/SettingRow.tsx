import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  brainTheme,
  opacity,
  radius,
  spacing,
  typography,
  type ThemeMode,
} from "../../theme/tokens";

export interface SettingRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  themeMode?: ThemeMode;
  testID?: string;
  accessibilityLabel?: string;
}

export function SettingRow({
  title,
  subtitle,
  value,
  showChevron = true,
  destructive = false,
  onPress,
  themeMode = "dark",
  testID = "setting-row",
  accessibilityLabel,
}: SettingRowProps) {
  const theme = brainTheme[themeMode];
  const titleColor = destructive ? theme.error : theme.text;
  const label = accessibilityLabel ?? title;

  const content = (
    <>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: titleColor }]} testID={`${testID}-title`}>
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
      <View style={styles.trailing}>
        {value ? (
          <Text
            style={[styles.value, { color: theme.textSecondary }]}
            testID={`${testID}-value`}
          >
            {value}
          </Text>
        ) : null}
        {showChevron ? (
          <Text
            style={[styles.chevron, { color: theme.textTertiary }]}
            testID={`${testID}-chevron`}
          >
            ›
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row} testID={testID}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  textBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: "500",
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  value: {
    ...typography.caption,
  },
  chevron: {
    fontSize: 20,
    lineHeight: 22,
  },
});
