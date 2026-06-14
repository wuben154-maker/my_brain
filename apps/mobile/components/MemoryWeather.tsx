import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

interface Props {
  headline: string;
  testID?: string;
}

export function MemoryWeather({ headline, testID = "memory-weather" }: Props) {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.label}>记忆天气</Text>
      <Text style={styles.headline}>{headline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1a1f2e",
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  headline: {
    color: colors.text,
    fontSize: 14,
  },
});
