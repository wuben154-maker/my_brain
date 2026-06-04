import { useCallback, useEffect, useRef, useState } from "react";
import { buildConversationContext } from "@/conversation/buildContext";
import { ConversationConductor } from "@/conversation/ConversationConductor";
import { applyIngestDecision } from "@/conversation/ingestActions";
import type { ConversationEvent } from "@/conversation/types";
import type { FinalizeCompanionDisconnectParams } from "@/hooks/companionSessionTypes";
import {
  conversationTurnsToLines,
  mergeTranscriptLines,
  useProfileDistillation,
} from "@/hooks/useProfileDistillation";
import { useWalkthroughHighlight } from "@/hooks/useWalkthroughHighlight";
import { parseIngestCommand } from "@/lib/parseIngestCommand";
import type { TranscriptLineLike } from "@/lib/profileDistillation";
import { finalizeVoiceSession } from "@/lib/voiceSessionFinalize";
import { useAppStore } from "@/stores/appStore";
import { useConversationStore } from "@/stores/conversationStore";
import { useGraphStore } from "@/stores/graphStore";
import { useIngestStore } from "@/stores/ingestStore";
import { useProfileStore } from "@/stores/profileStore";

/**
 * Binds ConversationConductor to voice: userSpeak → dispatch; speaking + interrupt → barge-in.
 * V5: finalizeVoiceSession on voice disconnect and when leaving companion phase.
 */
export function useConversationSession(options?: {
  voiceConnected?: boolean;
}) {
  const { distillFromLines, rememberFromLines } = useProfileDistillation();
  const phase = useAppStore((s) => s.phase);
  const newsQueue = useAppStore((s) => s.newsQueue);
  const providers = useAppStore((s) => s.providers);
  const profile = useProfileStore((s) => s.profile);

  const graphNodes = useGraphStore((s) => s.nodes);
  const graphEdges = useGraphStore((s) => s.edges);
  const setHighlights = useGraphStore((s) => s.setHighlights);
  const clearHighlights = useGraphStore((s) => s.clearHighlights);

  const walkthrough = useWalkthroughHighlight([], 1000);
  const walkthroughRef = useRef(walkthrough);
  walkthroughRef.current = walkthrough;

  const newsCursor = useConversationStore((s) => s.newsCursor);
  const onboarding = useConversationStore((s) => s.onboarding);
  const setState = useConversationStore((s) => s.setState);
  const setNewsCursor = useConversationStore((s) => s.setNewsCursor);
  const setOnboarding = useConversationStore((s) => s.setOnboarding);
  const setCurrentNewsItem = useConversationStore((s) => s.setCurrentNewsItem);
  const appendTurn = useConversationStore((s) => s.appendTurn);
  const conversationTurns = useConversationStore((s) => s.turns);
  const resetConversation = useConversationStore((s) => s.reset);

  const conductorRef = useRef<ConversationConductor | null>(null);
  const companionPrimedRef = useRef(false);
  const wasCompanionRef = useRef(false);
  const pendingOpeningRef = useRef<string | null>(null);
  const lastUserFinalRef = useRef<string | null>(null);
  const getContextRef = useRef<ReturnType<typeof buildConversationContext> | null>(
    null,
  );

  const voice = providers?.voice ?? null;
  const llm = providers?.llm ?? null;
  const isCompanion = phase === "companion";
  const [voiceConnectedInternal, setVoiceConnectedInternal] = useState(false);

  useEffect(() => {
    if (!voice) {
      setVoiceConnectedInternal(false);
      return;
    }
    const sync = () => {
      const state = voice.getState();
      setVoiceConnectedInternal(state !== "idle" && state !== "error");
    };
    sync();
    return voice.onStateChange(() => sync());
  }, [voice]);

  const voiceConnected = options?.voiceConnected ?? voiceConnectedInternal;

  const getContext = useCallback(() => {
    return buildConversationContext({
      newsQueue,
      newsCursor,
      graph: { nodes: graphNodes, edges: graphEdges },
      profile,
      onboarding,
    });
  }, [graphEdges, graphNodes, newsCursor, newsQueue, onboarding, profile]);

  getContextRef.current = getContext();

  const finalizeCompanionDisconnect = useCallback(
    async (params: FinalizeCompanionDisconnectParams) => {
      const merged = mergeTranscriptLines(
        conversationTurnsToLines(conversationTurns),
        params.transcripts,
      );
      await finalizeVoiceSession({
        transcripts: merged,
        disconnectVoice: params.disconnectVoice,
        distillProfile: distillFromLines,
        rememberSession: rememberFromLines,
        clearTranscripts: () => {
          params.clearTranscripts();
          resetConversation();
        },
      });
    },
    [
      conversationTurns,
      distillFromLines,
      rememberFromLines,
      resetConversation,
    ],
  );

  const finalizeCompanionSession = useCallback(
    async (transcriptSnapshot: TranscriptLineLike[]) => {
      await finalizeVoiceSession({
        transcripts: transcriptSnapshot,
        disconnectVoice: async () => undefined,
        distillProfile: distillFromLines,
        rememberSession: rememberFromLines,
        clearTranscripts: () => undefined,
      });
    },
    [distillFromLines, rememberFromLines],
  );

  useEffect(() => {
    if (!isCompanion || !llm || !voice) {
      conductorRef.current = null;
      companionPrimedRef.current = false;
      pendingOpeningRef.current = null;
      return;
    }

    if (!conductorRef.current) {
      conductorRef.current = new ConversationConductor({
        llm,
        voice,
        getContext: () => getContextRef.current ?? getContext(),
        onTurn: (turn) => {
          if (turn.nextState) {
            setState(turn.nextState);
          }
          if (turn.say.trim()) {
            appendTurn("assistant", turn.say);
          }
          if (turn.highlightNodeIds && turn.highlightNodeIds.length > 0) {
            if (turn.nextState === "teaching") {
              walkthroughRef.current.start(turn.highlightNodeIds);
            } else {
              walkthroughRef.current.stop();
              setHighlights(turn.highlightNodeIds, []);
            }
          }
          const ctx = getContextRef.current ?? getContext();
          const item = ctx.newsQueue[ctx.newsCursor] ?? null;
          setCurrentNewsItem(item);
          if (turn.nextState === "ingest_decision" && item) {
            const ingest = useIngestStore.getState();
            ingest.setActiveNewsId(item.id);
            ingest.setCursor(ctx.newsCursor);
            ingest.resetIngestParseAttempt();
            ingest.resetElaborationDepth();
            if (turn.say.trim()) {
              ingest.setExplanation(turn.say);
            }
          }
        },
        onContextPatch: (patch) => {
          if (patch.newsCursor !== undefined) {
            setNewsCursor(patch.newsCursor);
            useIngestStore.getState().setCursor(patch.newsCursor);
          }
          if (patch.onboarding !== undefined) {
            setOnboarding(patch.onboarding);
          }
        },
      });
    }
  }, [
    appendTurn,
    getContext,
    isCompanion,
    llm,
    setCurrentNewsItem,
    setHighlights,
    setNewsCursor,
    setOnboarding,
    setState,
    voice,
  ]);

  useEffect(() => {
    if (isCompanion) {
      wasCompanionRef.current = true;
      return;
    }

    if (wasCompanionRef.current) {
      wasCompanionRef.current = false;
      const snapshot = conversationTurnsToLines(
        useConversationStore.getState().turns,
      );
      if (snapshot.some((line) => line.role === "user" && line.text.trim())) {
        void finalizeCompanionSession(snapshot);
      }
    }

    companionPrimedRef.current = false;
    pendingOpeningRef.current = null;
    resetConversation();
    conductorRef.current?.reset();
  }, [finalizeCompanionSession, isCompanion, resetConversation]);

  useEffect(() => {
    if (!isCompanion) {
      return;
    }

    if (!conductorRef.current || companionPrimedRef.current) {
      return;
    }

    companionPrimedRef.current = true;
    void (async () => {
      const turn = await conductorRef.current?.start({ speak: false });
      if (turn?.say.trim()) {
        pendingOpeningRef.current = turn.say;
      }
    })();
  }, [isCompanion]);

  useEffect(() => {
    if (!voiceConnected || !voice || !pendingOpeningRef.current) {
      return;
    }
    const line = pendingOpeningRef.current;
    pendingOpeningRef.current = null;
    void voice.speak(line, { interruptible: true });
  }, [voice, voiceConnected]);

  const dispatch = useCallback(async (event: ConversationEvent) => {
    if (!conductorRef.current) {
      return;
    }
    await conductorRef.current.dispatch(event);
  }, []);

  const handleIngestTranscript = useCallback(
    async (transcript: string) => {
      const ctx = getContextRef.current ?? getContext();
      const item = ctx.newsQueue[ctx.newsCursor] ?? null;
      const storage = useAppStore.getState().storage;
      const appProviders = useAppStore.getState().providers;
      if (!item || !storage || !appProviders?.llm || !conductorRef.current) {
        return;
      }

      const ingest = useIngestStore.getState();
      const parsed = parseIngestCommand(transcript, ingest.ingestParseAttempt);

      if (parsed.kind === "reprompt") {
        ingest.setIngestParseAttempt(2);
        await conductorRef.current.dispatch(
          { type: "ingestReprompt" },
          { speak: true },
        );
        return;
      }

      ingest.resetIngestParseAttempt();
      try {
        const { event } = await applyIngestDecision(parsed.command, item, {
          storage,
          llm: appProviders.llm,
          profile: useProfileStore.getState().profile,
          memory: appProviders.memory,
        });
        if (event) {
          await conductorRef.current.dispatch(event, { speak: true });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "入库失败";
        ingest.setError(message);
        await conductorRef.current.dispatch(
          { type: "ingestAnswer", command: "skip" },
          { speak: true },
        );
      }
    },
    [getContext],
  );

  const onUserTranscript = useCallback(
    (transcript: string, final: boolean) => {
      if (!final || !transcript.trim()) {
        return;
      }
      const key = transcript.trim();
      if (lastUserFinalRef.current === key) {
        return;
      }
      lastUserFinalRef.current = key;
      appendTurn("user", key);

      if (useConversationStore.getState().currentState === "ingest_decision") {
        void handleIngestTranscript(key);
        return;
      }

      void dispatch({ type: "userSpeak", transcript: key });
    },
    [appendTurn, dispatch, handleIngestTranscript],
  );

  const onUserInterrupt = useCallback(() => {
    walkthroughRef.current.stop();
    clearHighlights();
    void dispatch({ type: "userInterrupt" });
  }, [clearHighlights, dispatch]);

  return {
    conductor: conductorRef.current,
    currentState: useConversationStore((s) => s.currentState),
    turns: useConversationStore((s) => s.turns),
    dispatch,
    onUserTranscript,
    onUserInterrupt,
    finalizeCompanionDisconnect,
    finalizeCompanionSession,
    isActive: isCompanion && conductorRef.current !== null,
    hasPendingOpening: pendingOpeningRef.current !== null,
  };
}
