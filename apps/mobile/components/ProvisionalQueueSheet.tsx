import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listPendingCandidates, ssrfRejectUserHint, formatCandidateTypeLabel } from "@my-brain/core";
import type { ProvisionalCandidate, SsrfRejectCode } from "@my-brain/core";

import {
  buildCaptureInboxRowViewModel,
  proposalFromCandidate,
} from "./captureInboxModel";
import { ContextDecisionSheet } from "./ContextDecisionSheet";
import { useConversationSession } from "../hooks/useConversationSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { colors } from "../theme/tokens";
import { labelsForVariant } from "../theme/contextDecisionLabels";
import { ContextDecisionBar } from "./ui/ContextDecisionBar";

/** Voice capture unavailable until live transport ships. */
const VOICE_CAPTURE_UNAVAILABLE = true;

const VOICE_UNAVAILABLE_BANNER =
  "语音暂不可用，可以先用文字确认这些星尘。";

const VOICE_NOTE_SHARE_UNAVAILABLE =
  "语音笔记暂不可用，可以先用文字或链接分享。";

const GENERIC_INTAKE_UNAVAILABLE = "暂时无法处理该分享内容";

/** Strip engineering gate/status tokens before showing queue banners. */
const ENGINEERING_LABEL_PATTERN =
  /M3|未\s*PASS|voice_disconnected|S\d{2}|SSRF_|fixture|mock_/i;

function userSafeQueueHint(raw: string): string {
  if (/voice_disconnected|M3|未\s*PASS/i.test(raw)) {
    return /语音笔记|分享/i.test(raw) ? VOICE_NOTE_SHARE_UNAVAILABLE : VOICE_UNAVAILABLE_BANNER;
  }
  if (ENGINEERING_LABEL_PATTERN.test(raw)) {
    return GENERIC_INTAKE_UNAVAILABLE;
  }
  return raw;
}

interface Props {
  testID?: string;
}

function sourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    text: "文字",
    link: "链接",
    learning: "学习",
    project: "项目",
    life: "生活",
    image_mock: "截图（演示）",
    voice_note_mock: "语音笔记（暂不可用）",
  };
  return labels[sourceType] ?? "其他";
}

function sourceLabelForConfirm(candidate: ProvisionalCandidate): string {
  if (candidate.linkUrl) {
    return `${formatCandidateTypeLabel(candidate)} · 分享链接`;
  }
  if (candidate.sourceType === "text") {
    return `${formatCandidateTypeLabel(candidate)} · 随手记`;
  }
  return formatCandidateTypeLabel(candidate);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "待确认",
    explaining: "讲解中",
    confirmed: "已确认",
    rejected: "已跳过",
  };
  return labels[status] ?? "待确认";
}

export function ProvisionalQueueSheet({ testID = "provisional-queue-sheet" }: Props) {
  const open = useMobileAppStore((s) => s.queueSheetOpen);
  const setOpen = useMobileAppStore((s) => s.setQueueSheetOpen);
  const activeProvisionalId = useMobileAppStore((s) => s.conversation.activeProvisionalId);
  const setPendingIngestProposal = useMobileAppStore((s) => s.setPendingIngestProposal);
  const candidates = useProvisionalStore((s) => s.candidates);
  const pending = listPendingCandidates(candidates);
  const lastExplanation = useProvisionalStore((s) => s.lastExplanation);
  const lastSsrfHint = useProvisionalStore((s) => s.lastSsrfHint);
  const { focusProvisional, dispatchIntent, confirmPendingIngest } = useConversationSession();
  const [confirmSheetOpen, setConfirmSheetOpen] = useState(false);
  const [confirmCandidateId, setConfirmCandidateId] = useState<string | null>(null);

  const confirmCandidate = useMemo(() => {
    if (!confirmCandidateId) {
      return null;
    }
    return pending.find((c) => c.id === confirmCandidateId) ?? null;
  }, [confirmCandidateId, pending]);

  const confirmRow = useMemo(
    () => (confirmCandidate ? buildCaptureInboxRowViewModel(confirmCandidate) : null),
    [confirmCandidate],
  );

  const selectedPending = useMemo(() => {
    if (!activeProvisionalId) {
      return null;
    }
    return pending.find((c) => c.id === activeProvisionalId) ?? null;
  }, [activeProvisionalId, pending]);

  const resolveIngestTarget = useCallback((): ProvisionalCandidate | null => {
    return selectedPending;
  }, [selectedPending]);

  const proposeIngest = useCallback(() => {
    const target = resolveIngestTarget();
    if (!target) {
      return;
    }
    focusProvisional(target.id);
    setPendingIngestProposal(proposalFromCandidate(target));
    setConfirmCandidateId(target.id);
    setConfirmSheetOpen(true);
  }, [focusProvisional, resolveIngestTarget, setPendingIngestProposal]);

  const safeSsrfHint = lastSsrfHint ? userSafeQueueHint(lastSsrfHint) : null;
  const showSsrfBanner =
    safeSsrfHint != null &&
    (!VOICE_CAPTURE_UNAVAILABLE || safeSsrfHint !== VOICE_UNAVAILABLE_BANNER);

  return (
    <>
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <Text style={styles.title}>待点亮星尘</Text>
          {pending.length > 0 ? (
            <Text style={styles.pendingCount} testID="provisional-pending-count">
              {pending.length} 条待确认
            </Text>
          ) : null}
          {VOICE_CAPTURE_UNAVAILABLE ? (
            <Text style={styles.voiceBanner} testID="voice-disconnected-banner">
              {VOICE_UNAVAILABLE_BANNER}
            </Text>
          ) : null}
          {showSsrfBanner ? (
            <Text style={styles.ssrfBanner} testID="ssrf-hint-banner">
              {safeSsrfHint}
            </Text>
          ) : null}
          <ScrollView style={{ maxHeight: 320 }}>
            {pending.length === 0 ? (
              <Text style={styles.empty}>暂无候选</Text>
            ) : (
              pending.map((c) => {
                const selected = c.id === activeProvisionalId;
                return (
                <Pressable
                  key={c.id}
                  style={[styles.item, selected ? styles.itemSelected : null]}
                  onPress={() => focusProvisional(c.id)}
                  testID={`provisional-item-${c.id}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.summary}>{c.summary}</Text>
                  <Text style={styles.meta} testID={`provisional-meta-${c.id}`}>
                    {sourceLabel(c.sourceType)} · {statusLabel(c.status)}
                    {c.linkUrl ? ` · ${c.linkUrl}` : ""}
                  </Text>
                  {c.ssrfRejectCode ? (
                    <Text style={styles.rejectCode} testID={`provisional-ssrf-${c.id}`}>
                      {ssrfRejectUserHint(c.ssrfRejectCode as SsrfRejectCode)}
                    </Text>
                  ) : c.fetchOk ? (
                    <Text style={styles.fetchOk} testID={`provisional-fetch-ok-${c.id}`}>
                      链接已校验
                    </Text>
                  ) : null}
                </Pressable>
              );
              })
            )}
          </ScrollView>
          {lastExplanation ? (
            <Text style={styles.explain} testID="provisional-explanation">
              {lastExplanation}
            </Text>
          ) : null}
          {pending.length > 0 && !selectedPending ? (
            <Text style={styles.selectHint} testID="provisional-select-hint">
              请选择一条星尘后再决定
            </Text>
          ) : null}
          {selectedPending ? (
            <ContextDecisionBar
              labelVariant="inbox"
              actions={[
                {
                  key: "ingest",
                  label: labelsForVariant("inbox").ingest,
                  onPress: proposeIngest,
                },
                {
                  key: "skip",
                  label: labelsForVariant("inbox").skip,
                  onPress: () => {
                    dispatchIntent("skip");
                    setOpen(false);
                  },
                },
                {
                  key: "detail",
                  label: labelsForVariant("inbox").detail,
                  onPress: () => dispatchIntent("explain_more"),
                  variant: "primary",
                },
              ]}
              testID="provisional-queue-context-bar"
            />
          ) : null}
          <Pressable onPress={() => setOpen(false)} style={styles.close}>
            <Text style={styles.closeText}>关闭</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <ContextDecisionSheet
      visible={confirmSheetOpen && confirmRow !== null}
      title={confirmRow?.title ?? ""}
      sourceLabel={
        confirmCandidate ? sourceLabelForConfirm(confirmCandidate) : undefined
      }
      whyRecommended={confirmRow?.whyMaybe ?? ""}
      description="用户确认前只是候选，不会写入永久星图。"
      labelVariant="sheet"
      onIngest={() => {
        confirmPendingIngest();
        setConfirmSheetOpen(false);
        setConfirmCandidateId(null);
        setOpen(false);
      }}
      onSkip={() => {
        setConfirmSheetOpen(false);
        setConfirmCandidateId(null);
        setPendingIngestProposal(null);
      }}
      onDetail={() => {
        dispatchIntent("explain_more");
      }}
      onDismiss={() => {
        setConfirmSheetOpen(false);
        setConfirmCandidateId(null);
        setPendingIngestProposal(null);
      }}
      testID="provisional-queue-confirm-sheet"
    />
  </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    minHeight: 280,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  pendingCount: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  voiceBanner: {
    color: colors.accent,
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  ssrfBanner: {
    color: "#f5a623",
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  empty: {
    color: colors.textMuted,
    padding: 16,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginVertical: 8,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  summary: {
    color: colors.text,
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  rejectCode: {
    color: "#f5a623",
    fontSize: 11,
    marginTop: 4,
  },
  fetchOk: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 4,
  },
  explain: {
    color: colors.primary,
    fontSize: 13,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  close: {
    alignItems: "center",
    padding: 12,
  },
  closeText: {
    color: colors.textMuted,
  },
});
