import { Pressable, StyleSheet, View } from "react-native";

import { brainTheme, type ThemeMode } from "../../theme/tokens";

export type ConstellationStarVariant =
  | "pending"
  | "warm"
  | "lit"
  | "dim"
  | "selected";

export interface ConstellationStarProps {
  variant?: ConstellationStarVariant;
  size?: number;
  onPress?: () => void;
  themeMode?: ThemeMode;
  testID?: string;
  accessibilityLabel?: string;
}

const MIN_TOUCH = 44;

function FourPointStar({ size, color }: { size: number; color: string }) {
  const arm = Math.max(2, Math.round(size * 0.34));
  return (
    <View style={[styles.starWrap, { width: size, height: size }]}>
      <View
        style={[
          styles.starArm,
          {
            width: arm,
            height: size,
            backgroundColor: color,
            borderRadius: arm / 2,
          },
        ]}
      />
      <View
        style={[
          styles.starArm,
          {
            width: size,
            height: arm,
            backgroundColor: color,
            borderRadius: arm / 2,
          },
        ]}
      />
    </View>
  );
}

function colorForVariant(
  variant: ConstellationStarVariant,
  themeMode: ThemeMode,
): string {
  const theme = brainTheme[themeMode];
  switch (variant) {
    case "pending":
    case "warm":
      return theme.accent;
    case "lit":
      return theme.constellationNode;
    case "dim":
      return theme.constellationNodeDim;
    case "selected":
      return theme.primary;
    default:
      return theme.constellationNode;
  }
}

export function ConstellationStar({
  variant = "lit",
  size = 12,
  onPress,
  themeMode = "dark",
  testID = "constellation-star",
  accessibilityLabel,
}: ConstellationStarProps) {
  const color = colorForVariant(variant, themeMode);
  const hitSize = Math.max(MIN_TOUCH, size);
  const label =
    accessibilityLabel ??
    (variant === "pending" ? "待点亮星" : variant === "selected" ? "已选中星" : "知识星");

  const star = (
    <View
      style={[
        styles.hitArea,
        { width: hitSize, height: hitSize },
        variant === "selected" && styles.selectedRing,
        variant === "selected" && { borderColor: brainTheme[themeMode].primary },
      ]}
      testID={testID}
    >
      <FourPointStar size={size} color={color} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={`${testID}-pressable`}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {star}
      </Pressable>
    );
  }

  return star;
}

const styles = StyleSheet.create({
  hitArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  starWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  starArm: {
    position: "absolute",
  },
  selectedRing: {
    borderWidth: 2,
    borderRadius: 9999,
  },
  pressed: {
    opacity: 0.85,
  },
});
