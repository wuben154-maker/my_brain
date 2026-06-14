import { Pressable, StyleSheet, Text, View } from "react-native";

import type { UserIntent } from "@my-brain/core";

import { copy, colors } from "../theme/tokens";

interface Props {
  onIntent: (intent: UserIntent) => void;
  disabled?: boolean;
  testID?: string;
}

export function IntentRail({
  onIntent,
  disabled,
  testID = "intent-rail",
}: Props) {
  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        style={[styles.chip, styles.primary]}
        onPress={() => onIntent("ingest")}
        disabled={disabled}
        testID="intent-ingest"
      >
        <Text style={styles.primaryText}>{copy.intents.ingest}</Text>
      </Pressable>
      <Pressable
        style={styles.chip}
        onPress={() => onIntent("skip")}
        disabled={disabled}
        testID="intent-skip"
      >
        <Text style={styles.chipText}>{copy.intents.skip}</Text>
      </Pressable>
      <Pressable
        style={styles.chip}
        onPress={() => onIntent("explain_more")}
        disabled={disabled}
        testID="intent-explain"
      >
        <Text style={styles.chipText}>{copy.intents.explain}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#333848",
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
  },
  primaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
