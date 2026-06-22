import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import {
  brainTheme,
  radius,
  shadows,
  spacing,
  type ThemeMode,
} from "../../theme/tokens";

export type GlassCardVariant = "default" | "muted";

export interface GlassCardProps extends ViewProps {
  children: ReactNode;
  variant?: GlassCardVariant;
  themeMode?: ThemeMode;
  testID?: string;
}

export function GlassCard({
  children,
  variant = "default",
  themeMode = "dark",
  style,
  testID = "glass-card",
  ...rest
}: GlassCardProps) {
  const theme = brainTheme[themeMode];
  const shadowStyle = themeMode === "dark" ? shadows.darkCard : shadows.lightCard;

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        shadowStyle,
        {
          backgroundColor:
            variant === "muted" ? theme.surfaceMuted : theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
});
