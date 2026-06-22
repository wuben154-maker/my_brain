import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { ActionDraft } from "@my-brain/core";

import { GlassCard } from "./ui/GlassCard";
import {
  brainTheme,
  radius,
  spacing,
  typography,
  type ThemeMode,
} from "../theme/tokens";

export interface ActionConfirmationSheetProps {
  visible: boolean;
  draft: ActionDraft | null;
  summaryLine?: string;
  themeMode?: ThemeMode;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

function defaultSummary(draft: ActionDraft | null): string {
  if (!draft) {
    return "";
  }
  if (draft.actionType === "draft_github_issue") {
    const payload = draft.payload as { title: string; repoHint?: string };
    const repo = payload.repoHint ? ` @ ${payload.repoHint}` : "";
    return `将创建 GitHub issue${repo}：${payload.title}`;
  }
  if (draft.actionType === "draft_blog_post") {
    const payload = draft.payload as { title: string };
    return `将导出/分享博客草稿：${payload.title}`;
  }
  return `将执行外部写操作：${draft.actionType}`;
}

/** Secondary confirmation for User-confirmed write — checkbox required (S16). */
export function ActionConfirmationSheet({
  visible,
  draft,
  summaryLine,
  themeMode = "dark",
  onConfirm,
  onCancel,
  testID = "action-confirmation-sheet",
}: ActionConfirmationSheetProps) {
  const theme = brainTheme[themeMode];
  const [checked, setChecked] = useState(false);
  const summary = summaryLine ?? defaultSummary(draft);

  const resetAndCancel = () => {
    setChecked(false);
    try {
      onCancel();
    } catch {
      // Contain sync handler faults at sheet boundary (CK-03).
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={resetAndCancel}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={resetAndCancel} testID={`${testID}-backdrop`}>
        <View
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
          testID={testID}
        >
          <Text style={[styles.heading, { color: theme.warning }]} testID={`${testID}-heading`}>
            确认外部写操作
          </Text>
          <Text
            style={[styles.disclaimer, { color: theme.textSecondary }]}
            accessibilityRole="text"
            testID={`${testID}-summary`}
          >
            {summary}
          </Text>

          <GlassCard themeMode={themeMode} style={styles.card} testID={`${testID}-detail`}>
            <Text style={[styles.detail, { color: theme.textSecondary }]}>
              此操作可能在外部系统创建内容。请确认你已阅读预览全文。
            </Text>
          </GlassCard>

          <Pressable
            onPress={() => setChecked((value) => !value)}
            style={styles.checkboxRow}
            testID={`${testID}-checkbox-row`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel="我已阅读并确认执行此外部写操作"
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: theme.border,
                  backgroundColor: checked ? theme.accentMuted : "transparent",
                },
              ]}
              testID={`${testID}-checkbox`}
            >
              {checked ? (
                <Text style={{ color: theme.accent }} accessibilityElementsHidden>
                  ✓
                </Text>
              ) : null}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.text }]}>
              我已阅读并确认执行此外部写操作
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (!checked) {
                return;
              }
              setChecked(false);
              try {
                onConfirm();
              } catch {
                // Contain sync handler faults at sheet boundary (CK-03).
              }
            }}
            disabled={!checked}
            style={[
              styles.confirmBtn,
              {
                backgroundColor: !checked ? theme.border : theme.warning,
                opacity: !checked ? 0.5 : 1,
              },
            ]}
            testID={`${testID}-confirm`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !checked }}
            accessibilityLabel="确认执行"
          >
            <Text style={[styles.confirmText, { color: theme.text }]}>确认执行</Text>
          </Pressable>

          <Pressable
            onPress={resetAndCancel}
            style={[styles.cancelBtn, { borderColor: theme.border }]}
            testID={`${testID}-cancel`}
            accessibilityRole="button"
            accessibilityLabel="取消"
          >
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>取消</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  heading: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  disclaimer: {
    ...typography.body,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  detail: {
    ...typography.caption,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    ...typography.body,
    flex: 1,
  },
  confirmBtn: {
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  confirmText: {
    ...typography.body,
    fontWeight: "600",
  },
  cancelBtn: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...typography.body,
  },
});
