import { StyleSheet, Text, View } from "react-native";

import type { DegradedModeCode } from "@my-brain/core";
import { degradedBannerText } from "@my-brain/core";

import { colors } from "../theme/tokens";

interface Props {
  codes: DegradedModeCode[];
  testID?: string;
}

export function DegradedModeBanner({ codes, testID = "degraded-mode-banner" }: Props) {
  if (codes.length === 0) {
    return null;
  }
  return (
    <View style={styles.banner} testID={testID} accessibilityRole="alert">
      <Text style={styles.label}>演示模式</Text>
      <Text style={styles.body}>{degradedBannerText(codes)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#2a2438",
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  label: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  body: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
