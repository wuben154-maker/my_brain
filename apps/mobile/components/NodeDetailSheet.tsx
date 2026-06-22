import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { GraphChangeRecord, GraphNode, NodeDisplayEnrichment } from "@my-brain/core";

import { brainTheme, radius, spacing, typography, type ThemeMode } from "../theme/tokens";

export interface NodeDetailSheetProps {
  visible: boolean;
  node: GraphNode | null;
  relatedNodes: GraphNode[];
  history: GraphChangeRecord[];
  sourceCount: number;
  relationCount: number;
  recentCurateCount: number;
  displayEnrichment: NodeDisplayEnrichment;
  onClose: () => void;
  onSelectRelated?: (nodeId: string) => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onUndoLastChange?: () => void;
  themeMode?: ThemeMode;
  testID?: string;
}

function historyKindLabel(kind: GraphChangeRecord["kind"]): string {
  const labels: Record<GraphChangeRecord["kind"], string> = {
    node_created: "新建/恢复",
    node_archived: "归档",
    edge_created: "建立关系",
    edge_migrated: "关系迁移",
    auto_curate_merge: "自动整理",
  };
  return labels[kind];
}

export function NodeDetailSheet({
  visible,
  node,
  relatedNodes,
  history,
  sourceCount,
  relationCount,
  recentCurateCount,
  displayEnrichment,
  onClose,
  onSelectRelated,
  onArchive,
  onRestore,
  onUndoLastChange,
  themeMode = "dark",
  testID = "node-detail-sheet",
}: NodeDetailSheetProps) {
  const theme = brainTheme[themeMode];

  if (!node) {
    return null;
  }

  const canUndo = history.some((item) => !item.undone);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="关闭节点详情"
          testID={`${testID}-backdrop`}
        />
        <View
          style={[styles.sheet, { backgroundColor: theme.surface }]}
          testID={testID}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} testID={`${testID}-handle`} />

          <ScrollView style={styles.scroll} testID={`${testID}-scroll`}>
            <Text style={[styles.kicker, { color: theme.primary }]} testID={`${testID}-kicker`}>
              你点亮的概念
            </Text>
            <Text style={[styles.title, { color: theme.text }]} testID={`${testID}-concept`}>
              {node.concept}
            </Text>
            <Text
              style={[styles.intro, { color: theme.textSecondary }]}
              numberOfLines={2}
              testID={`${testID}-intro`}
            >
              {node.intro}
            </Text>

            <Text style={[styles.meta, { color: theme.textTertiary }]} testID={`${testID}-meta`}>
              来源 {sourceCount} · 关系 {relationCount} · 最近整理 {recentCurateCount} 次
            </Text>

            <View style={styles.section} testID={`${testID}-evolution`}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>星图状态</Text>
              <Text style={[styles.evolutionLine, { color: theme.textSecondary }]} testID={`${testID}-source`}>
                来源：{displayEnrichment.source}
              </Text>
              <Text style={[styles.evolutionLine, { color: theme.textSecondary }]} testID={`${testID}-state`}>
                状态：{displayEnrichment.state === "active" ? "活跃" : "已归档"}
              </Text>
              <Text
                style={[styles.evolutionLine, { color: theme.textSecondary }]}
                testID={`${testID}-recent-change`}
              >
                最近变更：{displayEnrichment.recentChange ?? "暂无"}
              </Text>
              <Text
                style={[styles.evolutionLine, { color: theme.textSecondary }]}
                testID={`${testID}-curation-reason`}
              >
                整理原因：{displayEnrichment.curationReason ?? "暂无"}
              </Text>
            </View>

            {node.sourceLinks.length > 0 ? (
              <View style={styles.section} testID={`${testID}-sources`}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>来源链接</Text>
                {node.sourceLinks.map((link, index) => (
                  <Text
                    key={`${link}-${index}`}
                    style={[styles.link, { color: theme.primary }]}
                    testID={`${testID}-source-${index}`}
                  >
                    {link}
                  </Text>
                ))}
              </View>
            ) : null}

            {relatedNodes.length > 0 ? (
              <View style={styles.section} testID={`${testID}-related`}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>相关节点</Text>
                <View style={styles.chipRow}>
                  {relatedNodes.map((related) => (
                    <Pressable
                      key={related.id}
                      style={[styles.chip, { backgroundColor: theme.primaryMuted }]}
                      onPress={() => onSelectRelated?.(related.id)}
                      testID={`${testID}-related-${related.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`查看相关概念 ${related.concept}`}
                    >
                      <Text style={[styles.chipText, { color: theme.text }]}>{related.concept}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {history.length > 0 ? (
              <View style={styles.section} testID="node-detail-sheet-history">
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>最近整理记录</Text>
                {history.map((item) => (
                  <View key={item.id} style={styles.historyRow} testID={`${testID}-history-${item.id}`}>
                    <Text style={[styles.historyKind, { color: theme.accent }]}>
                      {historyKindLabel(item.kind)}
                    </Text>
                    <Text style={[styles.historySummary, { color: theme.textSecondary }]}>
                      {item.summary}
                    </Text>
                    <Text style={[styles.historyUndo, { color: theme.textTertiary }]}>
                      {item.undone ? "已撤销" : "可撤销"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {node.archived ? (
              <Text style={[styles.archiveHint, { color: theme.warning }]} testID={`${testID}-archived-hint`}>
                此概念已归档，星图上会变暗；归档不是删除，可随时恢复。
              </Text>
            ) : null}

            <View style={styles.actions} testID={`${testID}-actions`}>
              <Pressable
                style={[styles.actionBtn, styles.actionPrimary, { backgroundColor: theme.primaryMuted }]}
                testID={`${testID}-action-explain`}
                accessibilityRole="button"
                accessibilityLabel="讲给我听"
              >
                <Text style={[styles.actionText, { color: theme.text }]}>讲给我听</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted }]}
                disabled
                testID={`${testID}-action-quiz`}
                accessibilityRole="button"
                accessibilityLabel="考考我（演示占位）"
                accessibilityState={{ disabled: true }}
              >
                <Text style={[styles.actionText, { color: theme.textTertiary }]}>考考我</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.surfaceMuted }]}
                disabled
                testID={`${testID}-action-review`}
                accessibilityRole="button"
                accessibilityLabel="生成复习（演示占位）"
                accessibilityState={{ disabled: true }}
              >
                <Text style={[styles.actionText, { color: theme.textTertiary }]}>生成复习</Text>
              </Pressable>
            </View>

            <View style={styles.archiveRow}>
              {node.archived ? (
                <Pressable
                  onPress={onRestore}
                  style={[styles.archiveBtn, { borderColor: theme.primary }]}
                  testID={`${testID}-archive-restore`}
                  accessibilityRole="button"
                  accessibilityLabel="恢复此概念"
                >
                  <Text style={[styles.archiveBtnText, { color: theme.primary }]}>恢复此概念</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onArchive}
                  style={[styles.archiveBtn, { borderColor: theme.border }]}
                  testID={`${testID}-archive`}
                  accessibilityRole="button"
                  accessibilityLabel="归档此概念"
                >
                  <Text style={[styles.archiveBtnText, { color: theme.textSecondary }]}>归档</Text>
                </Pressable>
              )}
              {canUndo ? (
                <Pressable
                  onPress={onUndoLastChange}
                  style={[styles.archiveBtn, { borderColor: theme.border }]}
                  testID={`${testID}-undo`}
                  accessibilityRole="button"
                  accessibilityLabel="撤销最近整理"
                >
                  <Text style={[styles.archiveBtnText, { color: theme.textSecondary }]}>撤销整理</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "72%",
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  kicker: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 22,
  },
  intro: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFFFFF12",
    paddingTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  evolutionLine: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  link: {
    fontSize: 13,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
  },
  historyRow: {
    marginBottom: spacing.sm,
  },
  historyKind: {
    fontSize: 11,
    fontWeight: "600",
  },
  historySummary: {
    fontSize: 13,
    marginTop: 2,
  },
  historyUndo: {
    fontSize: 11,
    marginTop: 2,
  },
  archiveHint: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  actionPrimary: {},
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  archiveRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  archiveBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  archiveBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
