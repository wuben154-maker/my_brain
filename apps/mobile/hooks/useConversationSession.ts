import { useCallback } from "react";

import type { UserIntent } from "@my-brain/core";
import {
  applyIngestCreate,
  applyUserIntent,
  enterProvisionalPending,
  selectAdaptiveSignal,
  undoLastGraphChangeInMemory,
} from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

export function useConversationSession() {
  const conversation = useMobileAppStore((s) => s.conversation);
  const setConversation = useMobileAppStore((s) => s.setConversation);
  const graph = useMobileAppStore((s) => s.graph);
  const history = useMobileAppStore((s) => s.history);
  const syncGraphView = useMobileAppStore((s) => s.syncGraphView);
  const setLastIngestSummary = useMobileAppStore((s) => s.setLastIngestSummary);
  const signals = useMobileAppStore((s) => s.signals);
  const confirmProvisional = useProvisionalStore((s) => s.confirm);
  const rejectProvisional = useProvisionalStore((s) => s.reject);
  const explainProvisional = useProvisionalStore((s) => s.explain);

  const focusSignal = useCallback(
    (signalIndex: number) => {
      const sig = signals[signalIndex];
      if (!sig) {
        return;
      }
      const signalId = sig.evidenceRefs[0] ?? `signal-${signalIndex}`;
      setConversation(selectAdaptiveSignal(conversation, signalId));
    },
    [conversation, setConversation, signals],
  );

  const focusProvisional = useCallback(
    (provisionalId: string) => {
      setConversation(enterProvisionalPending(conversation, provisionalId));
    },
    [conversation, setConversation],
  );

  const dispatchIntent = useCallback(
    (intent: UserIntent) => {
      const { state: next, assistantReply } = applyUserIntent(conversation, intent);
      setConversation(next);

      if (intent === "ingest") {
        if (next.activeProvisionalId) {
          const result = confirmProvisional(next.activeProvisionalId);
          if (result) {
            setLastIngestSummary(result.autoCurateSummary);
            syncGraphView();
          }
          return assistantReply;
        }
        if (next.activeSignalId) {
          const idx = signals.findIndex((s) => s.evidenceRefs[0] === next.activeSignalId);
          const signal = signals[idx] ?? signals[0];
          if (signal) {
            const title = signal.evidenceRefs[0] ?? "新概念";
            applyIngestCreate(
              {
                concept: title.slice(0, 32),
                intro: `来自今日入口：${title}`,
                sourceLinks: signal.evidenceRefs,
              },
              { graph, history },
            );
            syncGraphView();
            setLastIngestSummary("星核已点亮");
          }
        }
      }

      if (intent === "skip" && next.activeProvisionalId) {
        rejectProvisional(next.activeProvisionalId);
      }

      if (intent === "explain_more" && next.activeProvisionalId) {
        explainProvisional(next.activeProvisionalId);
      }

      return assistantReply;
    },
    [
      conversation,
      setConversation,
      confirmProvisional,
      rejectProvisional,
      explainProvisional,
      signals,
      graph,
      history,
      syncGraphView,
      setLastIngestSummary,
    ],
  );

  const undoLastChange = useCallback(() => {
    const summary = undoLastGraphChangeInMemory(graph, history);
    syncGraphView();
    return summary;
  }, [graph, history, syncGraphView]);

  return {
    conversation,
    focusSignal,
    focusProvisional,
    dispatchIntent,
    undoLastChange,
  };
}
