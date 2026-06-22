import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { userModeLabel, type CorrectionRecord, type ProfileTrait } from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

interface Props {
  testID?: string;
  themeMode?: ThemeMode;
}

function traitSourceLabel(source: ProfileTrait["source"]): string {
  switch (source) {
    case "manual":
      return "你手动填写";
    case "behavior":
      return "从你的使用习惯";
    case "llm":
      return "从对话推断";
  }
}

function correctionActionLabel(action: CorrectionRecord["action"]): string {
  switch (action) {
    case "suppress":
      return "已隐藏";
    case "restore":
      return "已恢复";
    case "manual_override":
      return "已手动修正";
  }
}

function formatCorrectionHistory(
  correction: CorrectionRecord,
  traits: ProfileTrait[],
): string {
  const trait = traits.find((item) => item.id === correction.traitId);
  const traitName = trait?.label ?? "画像特征";
  return `${correctionActionLabel(correction.action)}「${traitName}」`;
}

export function ProfileReview({ testID = "profile-review", themeMode = "dark" }: Props) {
  const theme = brainTheme[themeMode];
  const profile = useMobileAppStore((s) => s.userProfile);
  const traits = useMobileAppStore((s) => s.correctionState.traits);
  const corrections = useMobileAppStore((s) => s.correctionState.corrections);
  const applyCorrection = useMobileAppStore((s) => s.applyCorrection);

  if (!profile) {
    return (
      <View style={styles.empty} testID={testID}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          完成冷启动后可查看画像
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} testID={testID}>
      <Text style={[styles.heading, { color: theme.text }]}>画像与纠偏</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        主模式：{userModeLabel(profile.primaryMode)} · 置信{" "}
        {Math.round(profile.confidence * 100)}%
      </Text>
      {traits.map((trait) => (
        <View
          key={trait.id}
          style={[styles.row, { backgroundColor: theme.surface }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.traitLabel, { color: theme.text }]}>
              {trait.label}
              {trait.suppressed ? "（已隐藏）" : ""}
            </Text>
            <Text style={[styles.source, { color: theme.textSecondary }]}>
              来源：{traitSourceLabel(trait.source)}
            </Text>
          </View>
          {!trait.suppressed ? (
            <Pressable
              onPress={() => applyCorrection(trait.id, "suppress")}
              style={[styles.btn, { backgroundColor: theme.surfaceMuted }]}
              testID={`profile-suppress-${trait.id}`}
            >
              <Text style={[styles.btnText, { color: theme.accent }]}>这不是我</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => applyCorrection(trait.id, "restore")}
              style={[styles.btnSecondary, { borderColor: theme.primary }]}
              testID={`profile-restore-${trait.id}`}
            >
              <Text style={[styles.btnTextSecondary, { color: theme.primary }]}>恢复</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Text style={[styles.historyTitle, { color: theme.textSecondary }]}>
        纠偏历史 ({corrections.length})
      </Text>
      {corrections.slice(-5).map((c, i) => (
        <Text
          key={`${c.traitId}-${c.at}-${i}`}
          style={[styles.historyItem, { color: theme.textSecondary }]}
        >
          {formatCorrectionHistory(c, traits)}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.md,
  },
  heading: {
    ...typography.title,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  sub: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  traitLabel: {
    fontSize: 15,
  },
  source: {
    fontSize: 11,
    marginTop: 2,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnSecondary: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnText: {
    fontSize: 12,
  },
  btnTextSecondary: {
    fontSize: 12,
  },
  historyTitle: {
    fontSize: 12,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  historyItem: {
    fontSize: 11,
    marginBottom: 4,
  },
  empty: {
    padding: spacing.md,
  },
  emptyText: {},
});
