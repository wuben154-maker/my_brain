import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CognitiveActionType } from "@my-brain/core";

import { ActionAuditLog } from "./ActionAuditLog";
import { ActionConfirmationSheet } from "./ActionConfirmationSheet";
import { ActionPreviewSheet } from "./ActionPreviewSheet";
import { createUserConfirmation, useCognitiveAction } from "../hooks/useCognitiveAction";
import {
  brainTheme,
  radius,
  spacing,
  typography,
  type ThemeMode,
} from "../theme/tokens";

export interface CognitiveActionPanelProps {
  themeMode?: ThemeMode;
  testID?: string;
}

const DEMO_ACTIONS: Array<{ type: CognitiveActionType; label: string }> = [
  { type: "draft_github_issue", label: "生成 GitHub issue 草稿" },
  { type: "draft_weekly_review", label: "生成周报草稿" },
];

/** Settings-local demo entry for draft-first cognitive actions (S16). */
export function CognitiveActionPanel({
  themeMode = "dark",
  testID = "cognitive-action-panel",
}: CognitiveActionPanelProps) {
  const theme = brainTheme[themeMode];
  const action = useCognitiveAction();
  const refreshToken = useMemo(
    () => (action.phase === "done" || action.phase === "error" ? Date.now() : 0),
    [action.phase],
  );

  return (
    <View testID={testID}>
      <Text style={[styles.intro, { color: theme.textSecondary }]}>
        认知行动仅生成草稿；外部写操作须二次确认。默认不自动发 issue 或博客。
      </Text>

      {DEMO_ACTIONS.map((item) => (
        <Pressable
          key={item.type}
          onPress={() =>
            action.startDraft(item.type, {
              title: item.type === "draft_github_issue" ? "整理图谱：自动 merge 建议" : "本周大脑回顾",
              summary: "基于当前图谱生成的建议草稿（演示）",
              conceptNames: ["Living Brain", "Knowledge Graph"],
              repoHint: "my_brain",
            })
          }
          style={[styles.demoBtn, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}
          testID={`${testID}-start-${item.type}`}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <Text style={[styles.demoBtnText, { color: theme.text }]}>{item.label}</Text>
        </Pressable>
      ))}

      {action.mockNotice ? (
        <Text style={[styles.mockNotice, { color: theme.warning }]} testID={`${testID}-mock-notice`}>
          {action.mockNotice}
        </Text>
      ) : null}

      {action.liveNotice ? (
        <Text style={[styles.liveNotice, { color: theme.success }]} testID={`${testID}-live-notice`}>
          {action.liveNotice}
        </Text>
      ) : null}

      {action.errorCode ? (
        <View style={styles.recoveryRow}>
          <Text style={[styles.errorText, { color: theme.warning }]} testID={`${testID}-error`}>
            执行失败：{action.errorCode}
          </Text>
          <Pressable
            onPress={() => void action.retryExecute()}
            style={[styles.retryBtn, { borderColor: theme.border }]}
            testID={`${testID}-retry`}
            accessibilityRole="button"
            accessibilityLabel="重试执行"
          >
            <Text style={{ color: theme.primary }}>重试</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.auditHeading, { color: theme.text }]}>行动记录</Text>
      <ActionAuditLog themeMode={themeMode} refreshToken={refreshToken} />

      <ActionPreviewSheet
        visible={action.phase === "preview"}
        draft={action.draft}
        canRemoteExecute={action.canRemoteExecute}
        remoteExecuteDisabledReason={action.remoteExecuteDisabledReason}
        themeMode={themeMode}
        onSaveDraft={action.saveDraftLocally}
        onProceedRemote={action.openConfirmation}
        onCancel={action.cancel}
      />

      <ActionConfirmationSheet
        visible={action.phase === "confirm" || action.phase === "executing"}
        draft={action.draft}
        themeMode={themeMode}
        onConfirm={() => void action.confirmAndExecute(createUserConfirmation())}
        onCancel={action.cancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  demoBtn: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  demoBtnText: {
    ...typography.body,
  },
  mockNotice: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  liveNotice: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  recoveryRow: {
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  retryBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  auditHeading: {
    ...typography.body,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
