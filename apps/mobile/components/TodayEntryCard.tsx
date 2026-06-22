import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassCard } from "./ui/GlassCard";
import {
  TODAY_CARD_ACTION_LABELS,
  type TodayEntryViewModel,
} from "./todayEntryModel";
import {
  brainTheme,
  getModeAccent,
  radius,
  spacing,
  typography,
  type IntentKey,
  type ThemeMode,
} from "../theme/tokens";

export interface TodayEntryCardProps {
  entry: TodayEntryViewModel;
  themeMode?: ThemeMode;
  selected?: boolean;
  onSelect?: () => void;
  onAction?: (intent: IntentKey) => void;
  testID?: string;
}

export function TodayEntryCard({
  entry,
  themeMode = "dark",
  selected = false,
  onSelect,
  onAction,
  testID = "today-entry-card",
}: TodayEntryCardProps) {
  const theme = brainTheme[themeMode];
  const accentColor = getModeAccent(entry.accentMode, themeMode);

  const actions: IntentKey[] = ["detail", "ingest", "skip"];

  return (
    <GlassCard
      themeMode={themeMode}
      style={[styles.card, selected ? styles.cardSelected : null]}
      testID={testID}
    >
      <View style={styles.row}>
        <View
          style={[styles.accentBar, { backgroundColor: accentColor }]}
          testID={`${testID}-accent`}
        />
        <View style={styles.content}>
          <Pressable
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityLabel={entry.title}
            testID={`${testID}-body`}
          >
            <Text
              style={[styles.tag, { color: accentColor }]}
              testID={`${testID}-tag`}
            >
              {entry.tag}
            </Text>
            <Text style={[styles.title, { color: theme.text }]} testID={`${testID}-title`}>
              {entry.title}
            </Text>
            <Text
              style={[styles.reason, { color: theme.textSecondary }]}
              testID="today-entry-reason"
            >
              {entry.reasonText}
            </Text>
          </Pressable>
          <View style={styles.actions}>
            {actions.map((actionKey) => (
              <Pressable
                key={actionKey}
                testID={`${testID}-action-${actionKey}`}
                onPress={() => onAction?.(actionKey)}
                accessibilityRole="button"
                accessibilityLabel={TODAY_CARD_ACTION_LABELS[actionKey]}
                style={[
                  styles.actionPill,
                  {
                    backgroundColor:
                      actionKey === entry.primaryAction
                        ? theme.primaryMuted
                        : theme.surfaceMuted,
                    borderColor:
                      actionKey === entry.primaryAction ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color:
                        actionKey === entry.primaryAction ? theme.primary : theme.text,
                    },
                  ]}
                >
                  {TODAY_CARD_ACTION_LABELS[actionKey]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: 0,
    overflow: "hidden",
  },
  cardSelected: {
    opacity: 1,
  },
  row: {
    flexDirection: "row",
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tag: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
  },
  reason: {
    ...typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionPill: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    ...typography.caption,
    fontWeight: "500",
  },
});
