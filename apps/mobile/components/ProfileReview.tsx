import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { userModeLabel } from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { colors } from "../theme/tokens";

interface Props {
  testID?: string;
}

export function ProfileReview({ testID = "profile-review" }: Props) {
  const profile = useMobileAppStore((s) => s.userProfile);
  const traits = useMobileAppStore((s) => s.correctionState.traits);
  const corrections = useMobileAppStore((s) => s.correctionState.corrections);
  const applyCorrection = useMobileAppStore((s) => s.applyCorrection);

  if (!profile) {
    return (
      <View style={styles.empty} testID={testID}>
        <Text style={styles.emptyText}>完成冷启动后可查看画像</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} testID={testID}>
      <Text style={styles.heading}>画像与纠偏</Text>
      <Text style={styles.sub}>
        主模式：{userModeLabel(profile.primaryMode)} · 置信{" "}
        {Math.round(profile.confidence * 100)}%
      </Text>
      {traits.map((trait) => (
        <View key={trait.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.traitLabel}>
              {trait.label}
              {trait.suppressed ? "（已隐藏）" : ""}
            </Text>
            <Text style={styles.source}>来源：{trait.source}</Text>
          </View>
          {!trait.suppressed ? (
            <Pressable
              onPress={() => applyCorrection(trait.id, "suppress")}
              style={styles.btn}
              testID={`profile-suppress-${trait.id}`}
            >
              <Text style={styles.btnText}>这不是我</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => applyCorrection(trait.id, "restore")}
              style={styles.btnSecondary}
              testID={`profile-restore-${trait.id}`}
            >
              <Text style={styles.btnTextSecondary}>恢复</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Text style={styles.historyTitle}>纠偏历史 ({corrections.length})</Text>
      {corrections.slice(-5).map((c, i) => (
        <Text key={`${c.traitId}-${c.at}-${i}`} style={styles.historyItem}>
          {c.action} · {c.traitId}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  traitLabel: {
    color: colors.text,
    fontSize: 15,
  },
  source: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  btn: {
    backgroundColor: "#3a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnText: {
    color: colors.accent,
    fontSize: 12,
  },
  btnTextSecondary: {
    color: colors.primary,
    fontSize: 12,
  },
  historyTitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 16,
    marginBottom: 6,
  },
  historyItem: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  empty: {
    padding: 16,
  },
  emptyText: {
    color: colors.textMuted,
  },
});
