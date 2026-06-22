import { StyleSheet, Text, View } from "react-native";

import type { ReverseQuestionResult } from "@my-brain/core";

import { GlassCard } from "../components/ui/GlassCard";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

interface Props {
  question: ReverseQuestionResult | null;
  enabled?: boolean;
  themeMode?: ThemeMode;
  testID?: string;
}

function formatEvidenceCaption(question: ReverseQuestionResult): string {
  if (question.evidenceRefs.length === 0) {
    return "暂无证据来源";
  }
  const preview = question.evidenceRefs.slice(0, 2).join(" · ");
  return question.evidenceRefs.length > 2
    ? `来源 ${preview} 等 ${question.evidenceRefs.length} 条`
    : `来源 ${preview}`;
}

export function ReverseQuestion({
  question,
  enabled = true,
  themeMode = "dark",
  testID = "reverse-question",
}: Props) {
  const theme = brainTheme[themeMode];
  const hasContent = Boolean(
    enabled && question?.visible && question.evidenceRefs.length > 0 && question.nodeIds.length > 0,
  );

  return (
    <GlassCard themeMode={themeMode} testID={testID} style={styles.card}>
      <Text style={[styles.sectionLabel, { color: "#FF9EC4" }]} testID={`${testID}-label`}>
        反向提问
      </Text>

      {!hasContent || !question ? (
        <View testID={`${testID}-empty`}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>图谱还空，反向提问稍后再来</Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]}>
            等星图亮起来后，我会根据你的概念来提问
          </Text>
        </View>
      ) : (
        <View testID={`${testID}-content`}>
          <Text style={[styles.prompt, { color: theme.text }]} testID={`${testID}-prompt`}>
            {question.prompt}
          </Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            我可以基于你的图谱追问多个角度。
          </Text>
          <Text style={[styles.caption, { color: theme.textTertiary }]} testID={`${testID}-evidence`}>
            {formatEvidenceCaption(question)}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  prompt: {
    ...typography.body,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  caption: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
});
