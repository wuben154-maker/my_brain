import { useCallback, useSyncExternalStore } from "react";

import {
  RealtimeVoiceTransportError,
  TokenExchangeError,
  resolveVoiceTranscript,
  type UserIntent,
} from "@my-brain/core";

import { createMockRealtimePlaybackQueue } from "./mockRealtimeTransport";
import {
  createMemorySecureTokenStore,
  voiceTokenStorageKey,
  type SecureTokenStore,
} from "./secureTokenStore";
import {
  createTokenExchangeClient,
  type TokenExchangeClient,
  type TokenExchangeClientOptions,
} from "./tokenExchangeClient";
import {
  createInitialVoiceSnapshot,
  reduceVoiceFsm,
  type VoiceFsmState,
  type VoiceSessionSnapshot,
} from "./VoiceSessionFsm";

export interface VoiceSessionDeps {
  deviceId: string;
  tokenClient?: TokenExchangeClient;
  tokenStore?: SecureTokenStore;
  tokenOptions?: TokenExchangeClientOptions;
  onIntent?: (intent: UserIntent) => void;
  onDegradedVoice?: (reason: "token_exchange" | "transport" | "permission" | "offline") => void;
  onClearDegradedVoice?: () => void;
}

export interface VoiceSessionController {
  getSnapshot: () => VoiceSessionSnapshot;
  subscribe: (cb: () => void) => () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  handleTranscript: (transcript: string, attempt: 1 | 2) => UserIntent | "reprompt" | null;
  simulateAssistantSpeak: (chunkCount?: number) => void;
  bargeIn: () => void;
  getFsmState: () => VoiceFsmState;
  isTransportPlaying: () => boolean;
  simulateTransportError: () => void;
}

export function createVoiceSessionController(deps: VoiceSessionDeps): VoiceSessionController {
  let snapshot = createInitialVoiceSnapshot();
  let connected = false;
  const playback = createMockRealtimePlaybackQueue();
  const tokenClient =
    deps.tokenClient ?? createTokenExchangeClient(deps.tokenOptions ?? { mode: "mock" });
  const tokenStore = deps.tokenStore ?? createMemorySecureTokenStore();
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((l) => l());
  const applyEvent = (event: Parameters<typeof reduceVoiceFsm>[1]) => {
    snapshot = reduceVoiceFsm(snapshot, event);
  };

  playback.onStateChange((playing) => {
    if (!playing && snapshot.state === "speaking") {
      applyEvent({ type: "assistant_reply_end" });
      notify();
    }
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getFsmState: () => snapshot.state,
    isTransportPlaying: () => playback.isPlaying(),
    async connect() {
      try {
        const token = await tokenClient.exchange(deps.deviceId);
        await tokenStore.set(voiceTokenStorageKey(), {
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
        });
        connected = true;
        applyEvent({ type: "start_listening" });
        deps.onClearDegradedVoice?.();
        notify();
      } catch (e) {
        connected = false;
        const message =
          e instanceof TokenExchangeError
            ? e.message
            : e instanceof Error
              ? e.message
              : "token exchange failed";
        applyEvent({ type: "transport_error", message });
        deps.onDegradedVoice?.("token_exchange");
        notify();
        throw e;
      }
    },
    disconnect() {
      connected = false;
      playback.interrupt();
      applyEvent({ type: "reset" });
      notify();
    },
    handleTranscript(transcript: string, attempt: 1 | 2) {
      if (!connected) {
        deps.onDegradedVoice?.("offline");
        return null;
      }
      applyEvent({ type: "user_utterance_end" });
      const resolved = resolveVoiceTranscript(transcript, attempt);
      if (resolved.kind === "reprompt") {
        applyEvent({ type: "start_listening" });
        notify();
        return "reprompt";
      }
      deps.onIntent?.(resolved.intent);
      applyEvent({ type: "assistant_reply_start" });
      notify();
      return resolved.intent;
    },
    simulateAssistantSpeak(chunkCount = 2) {
      if (!connected) {
        return;
      }
      applyEvent({ type: "assistant_reply_start" });
      playback.enqueueChunks(
        Array.from({ length: chunkCount }, (_, i) => ({
          id: `chunk-${i}`,
          durationMs: 40,
        })),
      );
      notify();
    },
    bargeIn() {
      if (snapshot.state !== "speaking") {
        return;
      }
      playback.interrupt();
      applyEvent({ type: "barge_in" });
      applyEvent({ type: "start_listening" });
      notify();
    },
    simulateTransportError() {
      playback.interrupt();
      connected = false;
      applyEvent({
        type: "transport_error",
        message: new RealtimeVoiceTransportError("mock transport disconnect").message,
      });
      deps.onDegradedVoice?.("transport");
      notify();
    },
  };
}

let sharedController: VoiceSessionController | null = null;

export function getVoiceSessionSingleton(deps: VoiceSessionDeps): VoiceSessionController {
  if (!sharedController) {
    sharedController = createVoiceSessionController(deps);
  }
  return sharedController;
}

export function resetVoiceSessionSingleton(): void {
  sharedController = null;
}

export function useVoiceSession(deps: VoiceSessionDeps) {
  const controller = useCallback(() => getVoiceSessionSingleton(deps), [deps]);
  const snapshot = useSyncExternalStore(
    controller().subscribe,
    controller().getSnapshot,
    controller().getSnapshot,
  );

  return {
    state: snapshot.state,
    lastError: snapshot.lastError,
    connect: controller().connect,
    disconnect: controller().disconnect,
    handleTranscript: controller().handleTranscript,
    simulateAssistantSpeak: controller().simulateAssistantSpeak,
    bargeIn: controller().bargeIn,
    simulateTransportError: controller().simulateTransportError,
    isPlaying: controller().isTransportPlaying,
  };
}
