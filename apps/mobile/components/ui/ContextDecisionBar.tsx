import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  labelsForVariant,
  type ContextDecisionLabelVariant,
} from "../../theme/contextDecisionLabels";
import {
  brainTheme,
  radius,
  spacing,
  typography,
  type IntentKey,
  type ThemeMode,
} from "../../theme/tokens";

export type ContextDecisionAction = {
  key: IntentKey;
  label?: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
};

export interface ContextDecisionBarProps {
  /** 1–3 contextual actions; labels default from labelVariant or intentLabels */
  actions: ContextDecisionAction[];
  labelVariant?: ContextDecisionLabelVariant;
  themeMode?: ThemeMode;
  testID?: string;
}

function resolveLabel(
  action: ContextDecisionAction,
  labelVariant?: ContextDecisionLabelVariant,
): string {
  if (action.label) {
    return action.label;
  }
  if (labelVariant) {
    return labelsForVariant(labelVariant)[action.key];
  }
  return brainTheme.intentLabels[action.key];
}

/** Presentational bar only — mount conditionally at call sites (S10). */
export function ContextDecisionBar({
  actions,
  labelVariant,
  themeMode = "dark",
  testID = "context-decision-bar",
}: ContextDecisionBarProps) {
  const theme = brainTheme[themeMode];
  const visible = actions.slice(0, 3);

  if (visible.length === 0) {
    return null;
  }

  return (
    <View style={styles.row} testID={testID}>
      {visible.map((action) => {
        const isPrimary = action.variant === "primary";
        const label = resolveLabel(action, labelVariant);
        return (
          <Pressable
            key={action.key}
            testID={`${testID}-${action.key}`}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={[
              styles.chip,
              isPrimary
                ? { backgroundColor: theme.primaryMuted, borderColor: theme.primary }
                : { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isPrimary ? theme.primary : theme.text },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    fontWeight: "500",
  },
});
