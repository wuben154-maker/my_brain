import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { PendingIngestProposal } from "@my-brain/core";

import {
  CAPTURE_INBOX_EMPTY_COPY,
  CAPTURE_INBOX_FILTER_CHIPS,
  buildCaptureInboxVisualFixtureRows,
  type CaptureInboxGroupId,
  type CaptureInboxRowViewModel,
  type CaptureInboxSectionViewModel,
  proposalFromCandidate,
} from "./captureInboxModel";
import { ContextDecisionSheet } from "./ContextDecisionSheet";
import { GlassCard } from "./ui/GlassCard";
import {
  brainTheme,
  colors,
  radius,
  spacing,
  typography,
  type ThemeMode,
  type ThemeColors,
} from "../theme/tokens";

export interface CaptureInboxListProps {
  sections: CaptureInboxSectionViewModel[];
  pendingCount: number;
  themeMode?: ThemeMode;
  onProposeIngest: (proposal: PendingIngestProposal, candidateId: string) => void;
  onKeepPending: (candidateId: string) => void;
  onDiscard: (candidateId: string) => void;
  onOpenDecisionSheet?: (row: CaptureInboxRowViewModel) => void;
  sheetRow?: CaptureInboxRowViewModel | null;
  sheetVisible?: boolean;
  onSheetDismiss?: () => void;
  onSheetIngest?: () => void;
  onSheetSkip?: () => void;
  onSheetDetail?: () => void;
  testID?: string;
  visualFixture?: boolean;
}

export function CaptureInboxList({
  sections,
  pendingCount,
  themeMode = "dark",
  onProposeIngest,
  onKeepPending,
  onDiscard,
  onOpenDecisionSheet,
  sheetRow = null,
  sheetVisible = false,
  onSheetDismiss,
  onSheetIngest,
  onSheetSkip,
  onSheetDetail,
  testID = "capture-inbox-list",
  visualFixture = false,
}: CaptureInboxListProps) {
  const theme = brainTheme[themeMode];
  const [filter, setFilter] = useState<"all" | CaptureInboxGroupId>("all");

  const fixtureRows = visualFixture ? buildCaptureInboxVisualFixtureRows(
    sections.flatMap((section) => section.rows.map((r) => r.candidate)),
  ) : [];

  const filteredSections =
    filter === "all"
      ? sections
      : sections
          .map((section) => ({
            ...section,
            rows: section.rows.filter((row) => row.groupId === filter),
          }))
          .filter((section) => section.rows.length > 0);

  const totalVisible = filteredSections.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <View style={styles.root} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContent}
        testID="capture-inbox-filter-row"
      >
        {CAPTURE_INBOX_FILTER_CHIPS.map((chip) => {
          const count =
            chip.id === "all"
              ? pendingCount
              : sections
                  .filter((s) => s.groupId === chip.id)
                  .reduce((n, s) => n + s.rows.length, 0);
          const selected = filter === chip.id;
          const label =
            chip.id === "all" ? `${chip.label} ${count}` : chip.label;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setFilter(chip.id)}
              style={[
                styles.chip,
                selected ? styles.chipSelected : styles.chipIdle,
                selected ? { borderColor: theme.primary } : { borderColor: theme.border },
              ]}
              testID={`capture-inbox-filter-${chip.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? theme.primary : theme.textSecondary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visualFixture ? (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.fixtureListContent}
          testID="capture-inbox-scroll"
        >
          {fixtureRows.map((row) => (
            <CaptureInboxRow
              key={row.id}
              row={row}
              themeMode={themeMode}
              visualFixture
              onLightUp={() => {
                onProposeIngest(proposalFromCandidate(row.candidate), row.id);
              }}
              onKeep={() => onKeepPending(row.id)}
              onDiscard={() => onDiscard(row.id)}
              onOrganize={() => onOpenDecisionSheet?.(row)}
            />
          ))}
        </ScrollView>
      ) : totalVisible === 0 ? (
        <Text
          style={[styles.empty, { color: theme.textSecondary }]}
          testID="capture-inbox-empty"
        >
          {CAPTURE_INBOX_EMPTY_COPY}
        </Text>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          testID="capture-inbox-scroll"
        >
          {filteredSections.map((section) => (
            <View
              key={section.groupId}
              accessibilityRole="list"
              accessibilityLabel={`${section.title}分组`}
              testID={`capture-inbox-section-${section.groupId}`}
            >
              <Text
                style={[styles.sectionTitle, { color: theme.textSecondary }]}
                testID={`capture-inbox-section-title-${section.groupId}`}
              >
                {section.title}
              </Text>
              {section.rows.map((row) => (
                <CaptureInboxRow
                  key={row.id}
                  row={row}
                  themeMode={themeMode}
                  onLightUp={() => {
                    onProposeIngest(proposalFromCandidate(row.candidate), row.id);
                  }}
                  onKeep={() => onKeepPending(row.id)}
                  onDiscard={() => onDiscard(row.id)}
                  onOrganize={() => onOpenDecisionSheet?.(row)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <ContextDecisionSheet
        visible={sheetVisible && sheetRow !== null}
        title={sheetRow?.title ?? ""}
        sourceLabel={
          sheetRow?.candidate.linkUrl ? "候选 · 分享链接" : "候选 · 星尘"
        }
        whyRecommended={sheetRow?.whyMaybe ?? ""}
        labelVariant="sheet"
        themeMode={themeMode}
        onIngest={() => onSheetIngest?.()}
        onSkip={() => onSheetSkip?.()}
        onDetail={() => onSheetDetail?.()}
        onDismiss={() => onSheetDismiss?.()}
      />
    </View>
  );
}

interface RowProps {
  row: CaptureInboxRowViewModel;
  themeMode: ThemeMode;
  onLightUp: () => void;
  onKeep: () => void;
  onDiscard: () => void;
  onOrganize: () => void;
}

function rowAccentColor(accentMode: CaptureInboxRowViewModel["accentMode"], theme: ThemeColors): string {
  if (accentMode === "warning") {
    return theme.warning;
  }
  if (accentMode === "accent") {
    return theme.accent;
  }
  return theme.primary;
}

function CaptureInboxRow({
  row,
  themeMode,
  visualFixture = false,
  onLightUp,
  onKeep,
  onDiscard,
  onOrganize,
}: RowProps & { visualFixture?: boolean }) {
  const theme = brainTheme[themeMode];
  const accentColor = rowAccentColor(row.accentMode, theme);
  const testId = `capture-inbox-row-${row.id}`;

  return (
    <GlassCard
      themeMode={themeMode}
      style={[styles.rowCard, visualFixture ? styles.fixtureRowCard : null]}
      testID={testId}
    >
      <View style={styles.rowHeader}>
        {!visualFixture ? (
          <View style={[styles.pendingDot, { backgroundColor: colors.accent }]} />
        ) : null}
        <Text style={[styles.meta, { color: accentColor }]} testID={`${testId}-meta`}>
          {visualFixture && row.groupId === "screenshot_ocr"
            ? `${row.sourceLabel} · ${row.timeLabel}`
            : `${row.sourceLabel} · ${row.timeLabel}`}
        </Text>
        {!visualFixture ? (
          <Text
            style={[styles.privacyBadge, { color: theme.textTertiary, borderColor: theme.border }]}
            testID={`${testId}-privacy`}
          >
            {row.privacyLabel}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.title, { color: theme.text }]} testID={`${testId}-title`}>
        {row.title}
      </Text>
      <Text
        style={[styles.whyMaybe, { color: theme.textSecondary }]}
        testID={`${testId}-why-maybe`}
      >
        {row.whyMaybe}
      </Text>
      <View style={[styles.actions, visualFixture ? styles.fixtureActions : null]}>
        <ActionButton
          label="点亮成星"
          primary
          accentColor={theme.accent}
          onPress={onLightUp}
          testID={`${testId}-action-light-up`}
          hint="点亮成星，进入确认入库"
          visualFixture={visualFixture}
        />
        {!visualFixture ? (
          <ActionButton
            label="先放着"
            onPress={onKeep}
            testID={`${testId}-action-keep`}
            hint="先放着，保持待确认"
            theme={theme}
          />
        ) : null}
        <ActionButton
          label="丢掉"
          onPress={onDiscard}
          testID={`${testId}-action-discard`}
          hint="丢掉这条候选"
          theme={theme}
          visualFixture={visualFixture}
        />
        <ActionButton
          label="整理一下"
          onPress={onOrganize}
          testID={`${testId}-action-organize`}
          hint="整理一下，S06 占位"
          theme={theme}
          visualFixture={visualFixture}
        />
      </View>
    </GlassCard>
  );
}

function ActionButton({
  label,
  onPress,
  testID,
  hint,
  primary,
  accentColor,
  theme,
  visualFixture = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  hint: string;
  primary?: boolean;
  accentColor?: string;
  theme?: ThemeColors;
  visualFixture?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionBtn,
        visualFixture ? styles.fixtureActionBtn : null,
        primary
          ? { backgroundColor: accentColor ?? "#E86B5A" }
          : { backgroundColor: visualFixture ? "rgba(255,255,255,0.04)" : "#2a2d36", borderColor: visualFixture ? "rgba(255,255,255,0.07)" : "#3a3f4b", borderWidth: 1 },
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <Text style={[styles.actionText, primary ? styles.actionTextPrimary : styles.actionTextMuted]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  chipRow: {
    maxHeight: 44,
    marginBottom: spacing.sm,
  },
  chipContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: "rgba(123, 140, 255, 0.15)",
  },
  chipIdle: {
    backgroundColor: "transparent",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    fontSize: 15,
    lineHeight: 24,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  rowCard: {
    marginBottom: spacing.sm,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  privacyBadge: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  whyMaybe: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  actionTextPrimary: {
    color: "#fff",
  },
  actionTextMuted: {
    color: "#c5cad6",
  },
  fixtureListContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  fixtureRowCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  fixtureActions: {
    flexWrap: "nowrap",
  },
  fixtureActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 34,
    borderRadius: radius.full,
  },
});
