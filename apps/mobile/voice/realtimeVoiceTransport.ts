import { RealtimeVoiceTransportError } from "@my-brain/core";

import type { VoiceProviderConfig } from "../services/providerConfigStore";

export const OPENAI_REALTIME_WS_URL = "wss://api.openai.com/v1/realtime";
export const DEFAULT_REALTIME_MODEL = "gpt-4o-realtime-preview";

export interface RealtimeConnectionRequest {
  url: string;
  protocols: string[];
  providerId: string;
  model: string;
}

export type VoiceRealtimeTransportKind = "mock" | "byok_live";

export interface VoiceRealtimeTransport {
  readonly kind: VoiceRealtimeTransportKind;
  connect(request: RealtimeConnectionRequest): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  /** User STT transcript boundary — OpenAI: conversation.item.input_audio_transcription.completed */
  onTranscript(listener: (transcript: string) => void): () => void;
  /** Doubao S2S assistant PCM playback state */
  onPlaybackStateChange?(listener: (playing: boolean) => void): () => void;
  bargeInPlayback?(): void;
}

export type WebSocketLike = {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  onclose: ((event?: { code?: number }) => void) | null;
  send(data: string): void;
  close(): void;
};

export type WebSocketConstructor = new (
  url: string,
  protocols?: string | string[],
) => WebSocketLike;

export interface RealtimeTransportFactoryOptions {
  WebSocket?: WebSocketConstructor;
  DoubaoWebSocket?: import("@my-brain/core").DoubaoWebSocketConstructor;
  connectTimeoutMs?: number;
}

export function buildOpenAiRealtimeConnectionRequest(
  apiKey: string,
  model: string = DEFAULT_REALTIME_MODEL,
): RealtimeConnectionRequest {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new RealtimeVoiceTransportError("voice API key required for live transport");
  }
  const url = `${OPENAI_REALTIME_WS_URL}?model=${encodeURIComponent(model)}`;
  return {
    url,
    protocols: [
      "realtime",
      `openai-insecure-api-key.${trimmedKey}`,
      "openai-beta.realtime-v1",
    ],
    providerId: "openai-realtime",
    model,
  };
}

/** Builds a Realtime WS handshake request from BYOK settings — no Token BFF. */
export function buildRealtimeConnectionRequest(
  voiceSettings: Pick<VoiceProviderConfig, "providerId" | "voiceModel" | "region">,
  apiKey: string,
): RealtimeConnectionRequest {
  if (voiceSettings.providerId === "mock") {
    throw new RealtimeVoiceTransportError("mock voice provider cannot open live transport");
  }
  const model = voiceSettings.voiceModel.trim() || DEFAULT_REALTIME_MODEL;
  return buildOpenAiRealtimeConnectionRequest(apiKey, model);
}

export function createMockRealtimeVoiceTransport(): VoiceRealtimeTransport {
  let connected = false;
  const transcriptListeners = new Set<(transcript: string) => void>();
  return {
    kind: "mock",
    async connect() {
      connected = true;
    },
    disconnect() {
      connected = false;
    },
    isConnected: () => connected,
    onTranscript(listener) {
      transcriptListeners.add(listener);
      return () => transcriptListeners.delete(listener);
    },
  };
}

const USER_TRANSCRIPT_EVENT = "conversation.item.input_audio_transcription.completed";

export function createByokRealtimeVoiceTransport(
  options: RealtimeTransportFactoryOptions = {},
): VoiceRealtimeTransport {
  const WebSocketImpl =
    options.WebSocket ?? (globalThis.WebSocket as unknown as WebSocketConstructor | undefined);
  let ws: WebSocketLike | null = null;
  let connected = false;
  const transcriptListeners = new Set<(transcript: string) => void>();

  const emitTranscript = (transcript: string) => {
    for (const listener of transcriptListeners) {
      listener(transcript);
    }
  };

  return {
    kind: "byok_live",
    onTranscript(listener) {
      transcriptListeners.add(listener);
      return () => transcriptListeners.delete(listener);
    },
    async connect(request: RealtimeConnectionRequest) {
      if (!WebSocketImpl) {
        throw new RealtimeVoiceTransportError("WebSocket unavailable");
      }

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocketImpl(request.url, request.protocols);
        ws = socket;
        let settled = false;

        const fail = (error: RealtimeVoiceTransportError) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          reject(error);
        };

        const succeed = () => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          connected = true;
          resolve();
        };

        const timer = setTimeout(() => {
          socket.close();
          fail(new RealtimeVoiceTransportError("realtime connection timeout"));
        }, options.connectTimeoutMs ?? 15_000);

        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              type: "session.update",
              session: {
                modalities: ["text", "audio"],
                voice: "alloy",
              },
            }),
          );
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as {
              type?: string;
              transcript?: string;
              error?: { message?: string; code?: string };
            };
            if (!settled && payload.type === "session.updated") {
              succeed();
            }
            if (!settled && payload.type === "error") {
              const code = payload.error?.code ?? "";
              const message = payload.error?.message ?? "realtime session error";
              if (code === "invalid_api_key" || message.toLowerCase().includes("unauthorized")) {
                fail(new RealtimeVoiceTransportError("unauthorized"));
                return;
              }
              fail(new RealtimeVoiceTransportError(message));
            }
            if (payload.type === USER_TRANSCRIPT_EVENT && payload.transcript?.trim()) {
              emitTranscript(payload.transcript.trim());
            }
          } catch {
            // Ignore non-JSON frames during handshake.
          }
        };

        socket.onerror = () => {
          fail(new RealtimeVoiceTransportError("realtime WebSocket error"));
        };

        socket.onclose = (event) => {
          connected = false;
          if (!settled && (event?.code === 1008 || event?.code === 4001)) {
            fail(new RealtimeVoiceTransportError("unauthorized"));
          }
        };
      });
    },
    disconnect() {
      ws?.close();
      ws = null;
      connected = false;
    },
    isConnected: () => connected,
  };
}

export type VoiceTransportTestStatus = "live" | "mock" | "degraded" | "error";

export interface VoiceTransportTestResult {
  status: VoiceTransportTestStatus;
  code?: string;
  hint?: string;
  endpointSummary?: string;
}

export interface VoiceTransportTestOptions {
  WebSocket?: WebSocketConstructor;
}

function mapTransportErrorToTestResult(
  error: unknown,
  endpointSummary: string,
): VoiceTransportTestResult {
  const message = error instanceof Error ? error.message : "voice connection failed";
  if (message.includes("unauthorized") || message.includes("401")) {
    return {
      status: "error",
      code: "UNAUTHORIZED",
      hint: "API Key 无效",
      endpointSummary,
    };
  }
  if (message.includes("timeout") || message.includes("WebSocket error")) {
    return {
      status: "error",
      code: "NETWORK_ERROR",
      hint: message,
      endpointSummary,
    };
  }
  return {
    status: "error",
    code: "TRANSPORT_ERROR",
    hint: message,
    endpointSummary,
  };
}

/** Transport-level voice test — live only after a successful mockable WS handshake. */
export async function testRealtimeVoiceTransport(
  voiceSettings: VoiceProviderConfig,
  hasKey: boolean,
  apiKey: string | null | undefined,
  voiceDisconnected: boolean,
  options?: VoiceTransportTestOptions,
): Promise<VoiceTransportTestResult> {
  const endpointSummary = `${voiceSettings.providerId} · ${voiceSettings.region}`;

  if (voiceDisconnected) {
    return {
      status: "degraded",
      code: "voice_disconnected",
      hint: "语音未连接，文字仍可用",
    };
  }

  if (!hasKey || voiceSettings.providerId === "mock") {
    return {
      status: "mock",
      hint: "演示模式 — 语音为模拟",
      endpointSummary: voiceSettings.region,
    };
  }

  if (!apiKey?.trim()) {
    return {
      status: "mock",
      hint: "演示模式 — 未配置语音 API Key",
      endpointSummary,
    };
  }

  try {
    const request = buildRealtimeConnectionRequest(voiceSettings, apiKey);
    const transport = createByokRealtimeVoiceTransport({ WebSocket: options?.WebSocket });
    await transport.connect(request);
    transport.disconnect();
    return {
      status: "live",
      hint: "已连接",
      endpointSummary,
    };
  } catch (error) {
    return mapTransportErrorToTestResult(error, endpointSummary);
  }
}
