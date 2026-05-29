import { useCallback, useEffect, useMemo, useState } from "react";
import { readAppEnv } from "@/lib/env";
import type { VoiceConnectionState, VoiceTranscriptEvent } from "@/providers/voice/types";
import { useAppStore } from "@/stores/appStore";

const DEFAULT_INSTRUCTIONS =
  "你是 my_brain，用户的 AI 大脑伴侣。用自然的中文口语交流，技术术语保留英文原词。回答简洁，像朋友聊天。用户可以随时打断你，被打断后立即停止并倾听。";

export interface TranscriptLine extends VoiceTranscriptEvent {
  id: string;
}

function stateLabel(state: VoiceConnectionState): string {
  switch (state) {
    case "idle":
      return "未连接";
    case "connecting":
      return "连接中…";
    case "listening":
      return "正在听";
    case "speaking":
      return "正在说";
    case "error":
      return "出错";
    default:
      return state;
  }
}

export function useVoiceSession() {
  const providers = useAppStore((state) => state.providers);
  const phase = useAppStore((state) => state.phase);
  const [voiceState, setVoiceState] = useState<VoiceConnectionState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const voice = providers?.voice ?? null;
  const canUseVoice = phase === "ready" || phase === "onboarding";

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
    return () => {
      if (voice && voice.getState() !== "idle") {
        void voice.disconnect();
      }
    };
  }, [voice]);

  const connect = useCallback(async () => {
    if (!voice || !canUseVoice) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);
    try {
      const env = readAppEnv();
      await voice.connect({
        apiKey: env.openAiApiKey,
        model: env.openAiRealtimeModel,
        instructions: DEFAULT_INSTRUCTIONS,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "无法建立语音连接",
      );
    } finally {
      setIsBusy(false);
    }
  }, [canUseVoice, voice]);

  const disconnect = useCallback(async () => {
    if (!voice) {
      return;
    }
    setIsBusy(true);
    try {
      await voice.disconnect();
    } finally {
      setIsBusy(false);
    }
  }, [voice]);

  const interrupt = useCallback(async () => {
    if (!voice) {
      return;
    }
    await voice.interrupt();
  }, [voice]);

  const statusLabel = useMemo(() => stateLabel(voiceState), [voiceState]);

  return {
    voiceState,
    statusLabel,
    transcripts,
    errorMessage,
    isBusy,
    canUseVoice,
    isConnected: voiceState !== "idle" && voiceState !== "error",
    connect,
    disconnect,
    interrupt,
  };
}
