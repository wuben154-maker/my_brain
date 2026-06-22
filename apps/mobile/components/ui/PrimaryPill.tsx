import { Pressable, StyleSheet, Text } from "react-native";

import {
  brainTheme,
  opacity,
  radius,
  spacing,
  textOnPrimary,
  typography,
  type ThemeMode,
} from "../../theme/tokens";

export interface PrimaryPillProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  themeMode?: ThemeMode;
  testID?: string;
  accessibilityLabel?: string;
}

export function PrimaryPill({
  label,
  onPress,
  disabled = false,
  themeMode = "dark",
  testID = "primary-pill",
  accessibilityLabel,
}: PrimaryPillProps) {
  const theme = brainTheme[themeMode];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.primary,
          opacity: disabled ? opacity.disabled : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={styles.label} testID={`${testID}-label`}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 48,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  label: {
    ...typography.body,
    fontWeight: "500",
    color: textOnPrimary,
  },
});
