import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ActionDraft } from "@my-brain/core";
import { requiresRemoteWrite } from "@my-brain/core";

import { GlassCard } from "./ui/GlassCard";
import {
  brainTheme,
  radius,
  spacing,
  typography,
  type ThemeMode,
} from "../theme/tokens";

export interface ActionPreviewSheetProps {
  visible: boolean;
  draft: ActionDraft | null;
  canRemoteExecute: boolean;
  remoteExecuteDisabledReason?: string;
  themeMode?: ThemeMode;
  onSaveDraft: () => void;
  onProceedRemote: () => void;
  onCancel: () => void;
  onEditTitle?: (title: string) => void;
  onEditBody?: (body: string) => void;
  testID?: string;
}

function draftPreviewText(draft: ActionDraft): { title: string; body: string } {
  switch (draft.actionType) {
    case "draft_github_issue": {
      const payload = draft.payload as { title: string; bodyMarkdown: string };
      return { title: payload.title, body: payload.bodyMarkdown };
    }
    case "draft_blog_post": {
      const payload = draft.payload as { title: string; bodyDraft: string; outline: string[] };
      return {
        title: payload.title,
        body: `${payload.outline.map((line) => `- ${line}`).join("\n")}\n\n${payload.bodyDraft}`,
      };
    }
    case "draft_roadmap": {
      const payload = draft.payload as {
        title: string;
        phases: Array<{ name: string; goals: string[] }>;
      };
      return {
        title: payload.title,
        body: payload.phases
          .map((phase) => `${phase.name}\n${phase.goals.map((g) => `  • ${g}`).join("\n")}`)
          .join("\n\n"),
      };
    }
    case "draft_learning_path": {
      const payload = draft.payload as {
        title: string;
        conceptSequence: string[];
        resourceLinks: string[];
      };
      return {
        title: payload.title,
        body: [
          payload.conceptSequence.map((c, i) => `${i + 1}. ${c}`).join("\n"),
          payload.resourceLinks.length > 0
            ? `\n资源：\n${payload.resourceLinks.map((l) => `- ${l}`).join("\n")}`
            : "",
        ].join("\n"),
      };
    }
    case "draft_research_followup": {
      const payload = draft.payload as { question: string; searchSuggestions: string[] };
      return {
        title: payload.question,
        body: payload.searchSuggestions.map((s) => `- ${s}`).join("\n"),
      };
    }
    case "draft_weekly_review": {
      const payload = draft.payload as { title: string; summaryText: string };
      return { title: payload.title, body: payload.summaryText };
    }
    default:
      return { title: "草稿", body: "" };
  }
}

/** Full-text readable/editable draft preview — draft-first (S16). */
export function ActionPreviewSheet({
  visible,
  draft,
  canRemoteExecute,
  remoteExecuteDisabledReason,
  themeMode = "dark",
  onSaveDraft,
  onProceedRemote,
  onCancel,
  onEditTitle,
  onEditBody,
  testID = "action-preview-sheet",
}: ActionPreviewSheetProps) {
  const theme = brainTheme[themeMode];
  const preview = useMemo(() => (draft ? draftPreviewText(draft) : { title: "", body: "" }), [draft]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (visible && draft) {
      setTitle(preview.title);
      setBody(preview.body);
    }
  }, [visible, draft, preview.title, preview.body]);

  const remote = draft ? requiresRemoteWrite(draft.actionType) : false;
  const primaryLabel = remote ? "确认并创建" : "保存草稿";
  const primaryDisabled = remote && !canRemoteExecute;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onCancel} testID={`${testID}-backdrop`}>
        <View
          style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
          testID={testID}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.textTertiary }]} />
          </View>

          <Text style={[styles.heading, { color: theme.text }]} testID={`${testID}-heading`}>
            行动草稿预览
          </Text>
          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            这是建议草稿，不会自动写入图谱或发布到外部。
          </Text>

          <ScrollView style={styles.scroll} testID={`${testID}-scroll`}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>标题</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceMuted },
              ]}
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                onEditTitle?.(value);
              }}
              testID={`${testID}-title-input`}
              accessibilityLabel="草稿标题"
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>正文</Text>
            <TextInput
              style={[
                styles.bodyInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceMuted },
              ]}
              value={body}
              onChangeText={(value) => {
                setBody(value);
                onEditBody?.(value);
              }}
              multiline
              testID={`${testID}-body-input`}
              accessibilityLabel="草稿正文"
            />

            {remote && !canRemoteExecute && remoteExecuteDisabledReason ? (
              <GlassCard themeMode={themeMode} style={styles.warnCard} testID={`${testID}-remote-disabled`}>
                <Text style={[styles.warnText, { color: theme.warning }]}>
                  远端执行不可用：{remoteExecuteDisabledReason}
                </Text>
              </GlassCard>
            ) : null}
          </ScrollView>

          <Pressable
            onPress={remote ? onProceedRemote : onSaveDraft}
            disabled={primaryDisabled}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: primaryDisabled ? theme.border : theme.accentMuted,
                borderColor: `${theme.accent}44`,
                opacity: primaryDisabled ? 0.5 : 1,
              },
            ]}
            testID={`${testID}-primary`}
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryDisabled }}
            accessibilityLabel={primaryLabel}
          >
            <Text style={[styles.primaryText, { color: theme.accent }]}>{primaryLabel}</Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            testID={`${testID}-cancel`}
            accessibilityRole="button"
            accessibilityLabel="取消"
          >
            <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>取消</Text>
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
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "88%",
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  heading: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  disclaimer: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  scroll: {
    maxHeight: 360,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  bodyInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 160,
    textAlignVertical: "top",
  },
  warnCard: {
    marginTop: spacing.md,
  },
  warnText: {
    ...typography.caption,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  primaryText: {
    ...typography.body,
    fontWeight: "600",
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    ...typography.body,
  },
});
