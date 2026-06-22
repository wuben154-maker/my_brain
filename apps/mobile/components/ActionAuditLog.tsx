import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActionAuditEntry } from "@my-brain/core";

import { listActionAuditEntries } from "../services/actionAuditStore";
import { GlassCard } from "./ui/GlassCard";
import {
  brainTheme,
  spacing,
  typography,
  type ThemeMode,
} from "../theme/tokens";

const ACTION_TYPE_LABELS: Record<string, string> = {
  draft_github_issue: "GitHub Issue 草稿",
  draft_blog_post: "博客草稿",
  draft_roadmap: "路线图草稿",
  draft_learning_path: "学习路线草稿",
  draft_research_followup: "研究跟进草稿",
  draft_weekly_review: "周报草稿",
};

export interface ActionAuditLogProps {
  themeMode?: ThemeMode;
  refreshToken?: number;
  testID?: string;
}

function formatStatus(status: ActionAuditEntry["status"]): string {
  switch (status) {
    case "draft":
      return "草稿";
    case "saved":
      return "已保存";
    case "executed":
      return "已执行";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    case "pending_confirmation":
      return "待确认";
    default:
      return status;
  }
}

/** Local action audit — metadata only; no draft body or API keys (S16). */
export function ActionAuditLog({
  themeMode = "dark",
  refreshToken = 0,
  testID = "action-audit-log",
}: ActionAuditLogProps) {
  const theme = brainTheme[themeMode];
  const [entries, setEntries] = useState<ActionAuditEntry[]>([]);

  useEffect(() => {
    setEntries(listActionAuditEntries());
  }, [refreshToken]);

  if (entries.length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.textSecondary }]} testID={`${testID}-empty`}>
        暂无行动记录。生成草稿或确认执行后会出现在这里。
      </Text>
    );
  }

  return (
    <View testID={testID}>
      {entries.slice(0, 20).map((entry) => (
        <GlassCard
          key={`${entry.actionId}-${entry.status}-${entry.createdAt}`}
          themeMode={themeMode}
          style={styles.row}
          testID={`${testID}-row-${entry.actionId}`}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {ACTION_TYPE_LABELS[entry.actionType] ?? entry.actionType}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatStatus(entry.status)} · {new Date(entry.createdAt).toLocaleString("zh-CN")}
          </Text>
          {entry.confirmedAt ? (
            <Text style={[styles.meta, { color: theme.textTertiary }]}>
              确认于 {new Date(entry.confirmedAt).toLocaleString("zh-CN")}
            </Text>
          ) : null}
          {entry.requestId ? (
            <Text style={[styles.meta, { color: theme.textTertiary }]} testID={`${testID}-request-id`}>
              请求 ID：{entry.requestId}
            </Text>
          ) : null}
          {entry.errorCode ? (
            <Text style={[styles.error, { color: theme.warning }]} testID={`${testID}-error`}>
              错误：{entry.errorCode}
            </Text>
          ) : null}
        </GlassCard>
      ))}
      <Pressable
        onPress={() => setEntries(listActionAuditEntries())}
        style={styles.refreshBtn}
        testID={`${testID}-refresh`}
        accessibilityRole="button"
        accessibilityLabel="刷新行动记录"
      >
        <Text style={[styles.refreshText, { color: theme.primary }]}>刷新记录</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typography.caption,
    paddingVertical: spacing.sm,
  },
  row: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.caption,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  refreshBtn: {
    minHeight: 44,
    justifyContent: "center",
  },
  refreshText: {
    ...typography.caption,
  },
});
