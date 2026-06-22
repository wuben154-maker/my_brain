import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function BackButton({
  onPress,
  testID = "page-header-back",
}: {
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="返回"
      testID={testID}
      style={styles.hit}
    >
      <Text style={[styles.glyph, { color: colors.text }]}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "600",
  },
});
