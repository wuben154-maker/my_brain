import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AdaptiveSignal } from "@my-brain/core";
import { userModeLabel } from "@my-brain/core";

import { colors } from "../theme/tokens";

export {
  buildTodayEntryViewModels,
  TODAY_CARD_ACTION_LABELS,
  TODAY_PAGE_COPY,
  type TodayEntryViewModel,
} from "./todayEntryModel";

interface Props {
  signals: AdaptiveSignal[];
  onSelect: (index: number) => void;
  testID?: string;
}

export function AdaptiveRadar({
  signals,
  onSelect,
  testID = "adaptive-radar",
}: Props) {
  if (signals.length === 0) {
    return (
      <View style={styles.empty} testID={testID}>
        <Text style={styles.emptyText}>今日入口暂空 — 可在设置里调整画像</Text>
      </View>
    );
  }

  const primary = signals[0]!;

  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.kicker}>今日入口 · {userModeLabel(primary.userModeFit)}</Text>
      <Pressable
        onPress={() => onSelect(0)}
        style={styles.primaryRow}
        testID="adaptive-radar-primary"
      >
        <Text style={styles.primaryTitle}>{primary.evidenceRefs[0]}</Text>
        <Text style={styles.meta}>
          {primary.sourceType} · 置信 {Math.round(primary.confidence * 100)}%
        </Text>
      </Pressable>
      {signals.slice(1).map((sig, i) => (
        <Pressable
          key={sig.evidenceRefs[0] ?? i}
          onPress={() => onSelect(i + 1)}
          style={styles.secondaryRow}
        >
          <Text style={styles.secondaryText}>{sig.evidenceRefs[0]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  primaryRow: {
    paddingVertical: 8,
  },
  primaryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  secondaryRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2c3040",
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 14,
  },
  empty: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
