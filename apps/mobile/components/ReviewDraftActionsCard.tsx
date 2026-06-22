import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReviewDraftAction } from "@my-brain/core";
import { cognitiveActionTypeForReviewDraft } from "@my-brain/core";

import { GlassCard } from "./ui/GlassCard";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

const KIND_LABELS: Record<ReviewDraftAction["kind"], string> = {
  weekly_review: "Weekly Brain Review",
  learning_coach: "Learning Coach",
  project: "Project Mode",
  writing: "Writing Draft",
  research: "Research Follow-up",
};

const KIND_COLORS: Record<ReviewDraftAction["kind"], string> = {
  weekly_review: "#7C9CFF",
  learning_coach: "#FF9EC4",
  project: "#6BCB8B",
  writing: "#C4A8FF",
  research: "#FFB86C",
};

export interface ReviewDraftActionsCardProps {
  actions: ReviewDraftAction[];
  themeMode?: ThemeMode;
  onGenerateDraft?: (action: ReviewDraftAction) => void;
  testID?: string;
}

export function ReviewDraftActionsCard({
  actions,
  themeMode = "dark",
  onGenerateDraft,
  testID = "review-draft-actions",
}: ReviewDraftActionsCardProps) {
  const theme = brainTheme[themeMode];

  if (actions.length === 0) {
    return null;
  }

  return (
    <View testID={testID}>
      {actions.map((action) => (
        <GlassCard
          key={action.id}
          themeMode={themeMode}
          style={styles.card}
          testID={`${testID}-${action.id}`}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.kindLabel, { color: KIND_COLORS[action.kind] }]}>
              {KIND_LABELS[action.kind]}
            </Text>
            <Text style={[styles.draftBadge, { color: theme.warning, borderColor: `${theme.warning}66` }]}>
              草稿
            </Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{action.title}</Text>
          <Text style={[styles.summary, { color: theme.textSecondary }]}>{action.summary}</Text>
          {onGenerateDraft ? (
            <Pressable
              style={[styles.generateButton, { borderColor: theme.border, backgroundColor: `${theme.text}0A` }]}
              onPress={() => onGenerateDraft(action)}
              testID={`${testID}-${action.id}-generate`}
              accessibilityRole="button"
              accessibilityLabel={`生成${action.title}草稿`}
            >
              <Text style={[styles.generateLabel, { color: theme.primary }]}>生成草稿</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      ))}

      <GlassCard themeMode={themeMode} style={styles.boundaryCard} testID={`${testID}-boundary`}>
        <Text style={[styles.kindLabel, { color: theme.warning }]}>草稿边界</Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          可以生成 issue / README / 博客草稿。
        </Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>
          不会自动发布，也不会自动创建 GitHub issue。
        </Text>
      </GlassCard>
    </View>
  );
}

/** Resolve draftBuilder action type for a review-layer suggestion. */
export function reviewDraftToCognitiveAction(action: ReviewDraftAction) {
  return cognitiveActionTypeForReviewDraft(action.kind);
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  boundaryCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  kindLabel: {
    ...typography.caption,
    fontWeight: "500",
  },
  draftBadge: {
    fontSize: 10,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  title: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  summary: {
    ...typography.caption,
    lineHeight: 20,
  },
  generateButton: {
    marginTop: spacing.sm,
    minHeight: 36,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  generateLabel: {
    ...typography.caption,
    fontWeight: "500",
  },
});
