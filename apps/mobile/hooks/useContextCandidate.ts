import { useCallback, useMemo } from "react";

import type { AdaptiveSignal } from "@my-brain/core";

import { buildCaptureInboxRowViewModel } from "../components/captureInboxModel";
import { buildTodayFocusViewModel } from "../components/TodayFocusCard";
import { useConversationSession } from "./useConversationSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import type { ContextDecisionLabelVariant } from "../theme/contextDecisionLabels";

export type ContextCandidateKind = "signal" | "provisional" | "today" | "node";

export interface ContextCandidate {
  kind: ContextCandidateKind;
  title: string;
  whyRecommended: string;
  sourceLabel?: string;
  description?: string;
  nodeIds: string[];
  labelVariant: ContextDecisionLabelVariant;
  onIngest: () => void;
  onSkip: () => void;
  onDetail: () => void;
}

export interface UseContextCandidateOptions {
  labelVariant: ContextDecisionLabelVariant;
  selectedNodeId?: string | null;
  selectedEntryId?: string | null;
  todayEntry?: {
    title: string;
    reasonText: string;
    signalIndex: number | null;
  } | null;
  selectedProvisionalId?: string | null;
  onProposeIngest?: () => void;
  onClearSelection?: () => void;
}

function sourceLabelForProvisional(sourceType: string, hasLink: boolean): string {
  if (hasLink) {
    return "候选 · 分享链接";
  }
  if (sourceType === "text") {
    return "候选 · 随手记";
  }
  return "候选 · 星尘";
}

function whyForSignal(signal: AdaptiveSignal): string {
  const refs = signal.evidenceRefs.join("、") || "今日入口";
  return `与当前画像匹配；关联 ${refs}。`;
}

export function useContextCandidate(
  options: UseContextCandidateOptions,
): ContextCandidate | null {
  const {
    labelVariant,
    selectedNodeId,
    selectedEntryId,
    todayEntry,
    selectedProvisionalId,
    onProposeIngest,
    onClearSelection,
  } = options;

  const conversation = useMobileAppStore((s) => s.conversation);
  const signals = useMobileAppStore((s) => s.signals);
  const userProfile = useMobileAppStore((s) => s.userProfile);
  const visibleNodes = useMobileAppStore((s) => s.visibleNodes);
  const setPendingIngestProposal = useMobileAppStore((s) => s.setPendingIngestProposal);
  const candidates = useProvisionalStore((s) => s.candidates);
  const { dispatchIntent } = useConversationSession();

  const onIngest = useCallback(() => {
    onProposeIngest?.();
  }, [onProposeIngest]);

  const onSkip = useCallback(() => {
    if (conversation.activeProvisionalId) {
      dispatchIntent("skip");
    }
    setPendingIngestProposal(null);
    onClearSelection?.();
  }, [
    conversation.activeProvisionalId,
    dispatchIntent,
    onClearSelection,
    setPendingIngestProposal,
  ]);

  const onDetail = useCallback(() => {
    dispatchIntent("explain_more");
  }, [dispatchIntent]);

  return useMemo(() => {
    const provisionalId =
      selectedProvisionalId ?? conversation.activeProvisionalId ?? null;
    if (provisionalId) {
      const candidate = candidates.find((c) => c.id === provisionalId);
      if (!candidate || candidate.status === "rejected" || candidate.status === "confirmed") {
        return null;
      }
      const row = buildCaptureInboxRowViewModel(candidate);
      return {
        kind: "provisional" as const,
        title: row.title,
        whyRecommended: row.whyMaybe,
        sourceLabel: sourceLabelForProvisional(
          candidate.sourceType,
          Boolean(candidate.linkUrl),
        ),
        nodeIds: candidate.evidenceRefs,
        labelVariant,
        onIngest,
        onSkip,
        onDetail,
      };
    }

    if (selectedEntryId && labelVariant === "today" && todayEntry) {
      if (todayEntry.signalIndex !== null) {
        const signal = signals[todayEntry.signalIndex];
        if (signal) {
          const vm = buildTodayFocusViewModel(signal, userProfile);
          if (vm) {
            return {
              kind: "today" as const,
              title: todayEntry.title,
              whyRecommended: todayEntry.reasonText,
              nodeIds: signal.evidenceRefs,
              labelVariant,
              onIngest,
              onSkip,
              onDetail,
            };
          }
        }
      }
      return {
        kind: "today" as const,
        title: todayEntry.title,
        whyRecommended: todayEntry.reasonText,
        nodeIds: [],
        labelVariant,
        onIngest,
        onSkip,
        onDetail,
      };
    }

    if (conversation.activeSignalId) {
      const idx = signals.findIndex((s) => s.evidenceRefs[0] === conversation.activeSignalId);
      const signal = signals[idx >= 0 ? idx : 0];
      if (!signal) {
        return null;
      }
      const vm = buildTodayFocusViewModel(signal, userProfile);
      return {
        kind: "signal" as const,
        title: vm?.title ?? "今日入口",
        whyRecommended: vm?.reasonText ?? whyForSignal(signal),
        nodeIds: signal.evidenceRefs,
        labelVariant,
        onIngest,
        onSkip,
        onDetail,
      };
    }

    if (selectedNodeId) {
      const node = visibleNodes.find((n) => n.id === selectedNodeId);
      if (!node) {
        return null;
      }
      return {
        kind: "node" as const,
        title: node.concept,
        whyRecommended: node.intro ?? "已点亮节点，可继续整理或补充关联。",
        nodeIds: [node.id],
        labelVariant: "node",
        onIngest,
        onSkip,
        onDetail,
      };
    }

    return null;
  }, [
    candidates,
    conversation.activeProvisionalId,
    conversation.activeSignalId,
    labelVariant,
    onDetail,
    onIngest,
    onSkip,
    selectedEntryId,
    selectedNodeId,
    selectedProvisionalId,
    todayEntry,
    signals,
    userProfile,
    visibleNodes,
  ]);
}
