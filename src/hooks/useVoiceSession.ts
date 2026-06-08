import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readAppEnv } from "@/lib/env";
import {
  distillAndPersistUserProfile,
  formatConversationTranscript,
  hasUserSpeech,
  type TranscriptLineLike,
} from "@/lib/profileDistillation";
import {
  distilledMemoryItemsFromTranscript,
} from "@/lib/memoryGrounding";
import { finalizeVoiceSession } from "@/lib/voiceSessionFinalize";
import type { FinalizeCompanionDisconnectParams } from "@/hooks/companionSessionTypes";
import {
  isMockVoiceProvider,
  MOCK_DEFAULT_UTTERANCE,
} from "@/providers/voice/mockVoiceProvider";
import type { VoiceConnectionState, VoiceTranscriptEvent } from "@/providers/voice/types";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

const DEFAULT_INSTRUCTIONS =
  "你是 my_brain，用户的 AI 大脑伴侣。用自然的中文口语交流，技术术语保留英文原词。回答简洁，像朋友聊天。用户可以随时打断你，被打断后立即停止并倾听。";

export interface TranscriptLine extends VoiceTranscriptEvent {
  id: string;
}

function stateLabel(state: VoiceConnectionState, isMock: boolean): string {
  switch (state) {
    case "idle":
      return "未连接";
    case "connecting":
      return "连接中…";
    case "listening":
      return isMock ? "正在聆听…（Mock）" : "正在听";
    case "speaking":
      return isMock ? "正在说…（Mock）" : "正在说";
    case "error":
      return "出错";
    default:
      return state;
  }
}

export type { FinalizeCompanionDisconnectParams } from "@/hooks/companionSessionTypes";

export function useVoiceSession(options?: {
  finalizeCompanionDisconnect?: (
    params: FinalizeCompanionDisconnectParams,
  ) => Promise<void>;
}) {
  const providers = useAppStore((state) => state.providers);
  const newsCount = useAppStore((state) => state.newsQueue.length);
  const phase = useAppStore((state) => state.phase);
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDistilling, setIsDistilling] = useState(false);
  const transcriptsRef = useRef<TranscriptLine[]>([]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  const voice = providers?.voice ?? null;
  const isMockVoice = voice !== null && isMockVoiceProvider(voice);
  const canUseVoice = phase === "companion";
  const finalizeCompanionDisconnect = options?.finalizeCompanionDisconnect;

  useEffect(() => {
    if (!voice) {
      return;
    }

    const unsubscribeState = voice.onStateChange((state) => {
      setVoiceState(state);
      if (state === "error") {
        setErrorMessage("语音通道异常，请断开后重试");
      }
    });

    const unsubscribeTranscript = voice.onTranscript((event) => {
      setTranscripts((current) => {
        const role = event.role;
        const last = current[current.length - 1];
        if (!event.final && last && last.role === role && !last.final) {
          return [
            ...current.slice(0, -1),
            { ...last, text: event.text, final: false },
          ];
        }
        if (event.final && last && last.role === role && !last.final) {
          return [
            ...current.slice(0, -1),
            { ...last, text: event.text, final: true },
          ];
        }
        return [
          ...current,
          {
            id: `${Date.now()}-${current.length}`,
            ...event,
          },
        ];
      });
    });

    setVoiceState(voice.getState());

    return () => {
      unsubscribeState();
      unsubscribeTranscript();
    };
  }, [voice]);

  useEffect(() => {
    if (!isMockVoice || !voice) {
      return;
    }
    voice.setReplyContext({ newsCount });
  }, [isMockVoice, newsCount, voice]);

  useEffect(() => {
    return () => {
      if (voice && voice.getState() !== "idle") {
        void voice.disconnect();
      }
    };
  }, [voice]);

  const connect = useCallback(async (options?: { skipWelcomeUtterance?: boolean }) => {
    if (!voice || !canUseVoice) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);
    try {
      const env = readAppEnv();
      if (!isMockVoiceProvider(voice) && !env.openAiApiKey) {
        throw new Error("缺少 OpenAI API Key");
      }
      await voice.connect({
        apiKey: env.openAiApiKey,
        model: env.openAiRealtimeModel,
        instructions: DEFAULT_INSTRUCTIONS,
        skipWelcomeUtterance: options?.skipWelcomeUtterance,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "无法建立语音连接",
      );
    } finally {
      setIsBusy(false);
    }
  }, [canUseVoice, voice]);

  const distillBeforeDiscard = useCallback(
    async (lines: TranscriptLineLike[]): Promise<boolean> => {
      if (!hasUserSpeech(lines)) {
        return true;
      }

      const storage = useAppStore.getState().storage;
      const llm = useAppStore.getState().providers?.llm;
      if (!storage || !llm) {
        setErrorMessage("用户画像蒸馏不可用：存储或语言模型未就绪");
        return false;
      }

      const transcript = formatConversationTranscript(lines);
      setIsDistilling(true);
      try {
        const current = useProfileStore.getState().profile;
        const next = await distillAndPersistUserProfile(
          storage,
          llm,
          transcript,
          current,
        );
        useProfileStore.getState().setProfile(next);
        useProfileStore.getState().markDistilled(next.updatedAt);
        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "用户画像蒸馏失败",
        );
        return false;
      } finally {
        setIsDistilling(false);
      }
    },
    [],
  );

  const rememberBeforeDiscard = useCallback(async (lines: TranscriptLineLike[]) => {
    if (!hasUserSpeech(lines)) {
      return;
    }

    const memory = useAppStore.getState().providers?.memory;
    if (!memory) {
      return;
    }

    const transcript = formatConversationTranscript(lines);
    const items = distilledMemoryItemsFromTranscript(transcript);
    if (items.length === 0) {
      return;
    }

    try {
      await memory.remember(items);
    } catch {
      // Graceful degrade — memory sidecar optional (M0/M1).
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!voice) {
      return;
    }
    setIsBusy(true);
    try {
      const runFinalize =
        finalizeCompanionDisconnect ??
        (async (params: FinalizeCompanionDisconnectParams) => {
          await finalizeVoiceSession({
            transcripts: params.transcripts,
            disconnectVoice: params.disconnectVoice,
            distillProfile: (lines) => distillBeforeDiscard(lines),
            rememberSession: (lines) => rememberBeforeDiscard(lines),
            clearTranscripts: params.clearTranscripts,
          });
        });

      await runFinalize({
        transcripts: transcriptsRef.current,
        disconnectVoice: () => voice.disconnect(),
        clearTranscripts: () => setTranscripts([]),
      });
    } finally {
      setIsBusy(false);
    }
  }, [
    distillBeforeDiscard,
    finalizeCompanionDisconnect,
    rememberBeforeDiscard,
    voice,
  ]);

  const interrupt = useCallback(async () => {
    if (!voice) {
      return;
    }
    await voice.interrupt();
  }, [voice]);

  const simulateUserSpeech = useCallback(
    (text: string = MOCK_DEFAULT_UTTERANCE) => {
      if (!voice || !isMockVoiceProvider(voice)) {
        return;
      }
      voice.simulateUserSpeech(text);
    },
    [voice],
  );

  const statusLabel = useMemo(
    () => stateLabel(voiceState, isMockVoice),
    [isMockVoice, voiceState],
  );

  return {
    voiceState,
    statusLabel,
    transcripts,
    errorMessage,
    isBusy,
    isDistilling,
    canUseVoice,
    isMockVoice,
    isConnected: voiceState !== "idle" && voiceState !== "error",
    connect,
    disconnect,
    interrupt,
    simulateUserSpeech,
  };
}
