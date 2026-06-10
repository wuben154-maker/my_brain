import { MicCapture } from "./audio/micCapture";
import { SpeakerPlayback } from "./audio/speakerPlayback";
import type {
  VoiceConnectionState,
  VoiceProvider,
  VoiceProviderConfig,
  VoiceSpeakProgressEvent,
  VoiceTimbre,
  VoiceTranscriptEvent,
} from "./types";
import {
  buildStartSessionPayload,
  decodeVolcFrame,
  encodeAudioTaskRequest,
  encodeClientInterrupt,
  encodeJsonClientEvent,
  encodeStartConnection,
  parseJsonPayload,
} from "./volcengine/volcBinaryProtocol";
import {
  VOLC_CLIENT_EVENT,
  VOLC_REALTIME_APP_KEY,
  VOLC_REALTIME_RESOURCE_ID,
  VOLC_REALTIME_WS_URL,
  VOLC_SERVER_EVENT,
} from "./volcengine/volcRealtimeConstants";
import {
  resolveVolcRealtimeCredentials,
  volcNativeTransportRequiredMessage,
  volcRealtimeRequiresNativeTransport,
  type VolcRealtimeCredentials,
} from "./volcengine/volcRealtimeConfig";

export interface VolcVoiceProviderConfig extends VoiceProviderConfig {
  volcAppId?: string;
  volcAccessKey?: string;
  volcConnectId?: string;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Volcengine / 豆包端到端实时语音 adapter skeleton.
 * Implements protocol boundary + barge-in (ClientInterrupt) wiring; live browser
 * connect is blocked until native header-capable transport is available.
 */
export class VolcengineRealtimeVoiceProvider implements VoiceProvider {
  readonly id = "volc-realtime";

  private state: VoiceConnectionState = "idle";
  private stateListeners = new Set<(state: VoiceConnectionState) => void>();
  private transcriptListeners = new Set<
    (event: VoiceTranscriptEvent) => void
  >();
  private speakProgressListeners = new Set<
    (evt: VoiceSpeakProgressEvent) => void
  >();

  private ws: WebSocket | null = null;
  private mic = new MicCapture();
  private speaker = new SpeakerPlayback();
  private timbre: VoiceTimbre = "nova";
  private credentials: VolcRealtimeCredentials | null = null;
  private sessionId: string | null = null;

  async connect(config: VolcVoiceProviderConfig): Promise<void> {
    const credentials = resolveVolcRealtimeCredentials({
      volcAppId: config.volcAppId,
      volcAccessKey: config.volcAccessKey ?? config.apiKey,
      volcConnectId: config.volcConnectId,
      volcRealtimeModel: config.model,
    });

    if (volcRealtimeRequiresNativeTransport()) {
      throw new Error(volcNativeTransportRequiredMessage());
    }

    if (this.ws) {
      await this.disconnect();
    }

    this.credentials = credentials;
    this.setState("connecting");

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(VOLC_REALTIME_WS_URL);
      this.ws = ws;

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        ws.send(encodeStartConnection());
      };

      ws.onmessage = (message) => {
        void this.handleServerFrame(message.data);
      };

      ws.onerror = () => {
        this.fail("豆包实时语音连接失败，请检查凭证与网络");
        reject(new Error("Volc realtime WebSocket error"));
      };

      ws.onclose = () => {
        if (this.state !== "idle" && this.state !== "error") {
          this.cleanupTransport();
          this.setState("idle");
        }
      };

      this.sessionReady = resolve;
      this.sessionFailed = reject;
    }).catch((error: unknown) => {
      this.cleanupTransport();
      if (this.state !== "error") {
        this.setState("idle");
      }
      throw error;
    });
  }

  private sessionReady: (() => void) | null = null;
  private sessionFailed: ((error: Error) => void) | null = null;

  async disconnect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.sessionId) {
      this.ws.send(
        encodeJsonClientEvent({
          eventId: VOLC_CLIENT_EVENT.finishSession,
          sessionId: this.sessionId,
          payload: {},
        }),
      );
    }
    this.cleanupTransport();
    this.setState("idle");
  }

  async interrupt(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionId) {
      return;
    }
    this.speaker.stopImmediately();
    this.ws.send(encodeClientInterrupt(this.sessionId));
    this.setState("listening");
  }

  async speak(
    text: string,
    opts?: { interruptible?: boolean },
  ): Promise<void> {
    void opts;
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.emitSpeakProgress({ text: trimmed, chunk: trimmed });
    this.emitTranscript({ role: "assistant", text: trimmed, final: true });
  }

  setVoice(timbre: VoiceTimbre): void {
    this.timbre = timbre;
  }

  getVoice(): VoiceTimbre {
    return this.timbre;
  }

  getState(): VoiceConnectionState {
    return this.state;
  }

  onStateChange(listener: (state: VoiceConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onTranscript(listener: (event: VoiceTranscriptEvent) => void): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  onSpeakProgress(
    listener: (evt: VoiceSpeakProgressEvent) => void,
  ): () => void {
    this.speakProgressListeners.add(listener);
    return () => this.speakProgressListeners.delete(listener);
  }

  /** Exposed for tests — documented Volc handshake headers. */
  buildConnectHeaders(credentials: VolcRealtimeCredentials): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Api-App-ID": credentials.appId,
      "X-Api-Access-Key": credentials.accessKey,
      "X-Api-Resource-Id": VOLC_REALTIME_RESOURCE_ID,
      "X-Api-App-Key": VOLC_REALTIME_APP_KEY,
    };
    if (credentials.connectId) {
      headers["X-Api-Connect-Id"] = credentials.connectId;
    }
    return headers;
  }

  private async handleServerFrame(data: unknown): Promise<void> {
    if (!(data instanceof ArrayBuffer)) {
      return;
    }
    const frame = decodeVolcFrame(data);

    if (frame.eventId === VOLC_SERVER_EVENT.connectionStarted) {
      await this.startSession();
      return;
    }

    if (frame.eventId === VOLC_SERVER_EVENT.connectionFailed) {
      const payload = parseJsonPayload<{ error?: string }>(frame.payload);
      this.fail(payload?.error ?? "豆包连接失败");
      this.sessionFailed?.(new Error(payload?.error ?? "connection failed"));
      this.sessionFailed = null;
      this.sessionReady = null;
      return;
    }

    if (frame.eventId === VOLC_SERVER_EVENT.sessionStarted) {
      await this.startMic();
      this.setState("listening");
      this.sessionReady?.();
      this.sessionReady = null;
      this.sessionFailed = null;
      return;
    }

    if (frame.eventId === VOLC_SERVER_EVENT.asrResponse) {
      const payload = parseJsonPayload<{ text?: string; is_final?: boolean }>(
        frame.payload,
      );
      if (payload?.text) {
        this.emitTranscript({
          role: "user",
          text: payload.text,
          final: Boolean(payload.is_final),
        });
      }
      return;
    }

    if (frame.eventId === VOLC_SERVER_EVENT.ttsResponse && frame.payload.length) {
      const base64 = bytesToBase64(frame.payload);
      await this.speaker.enqueuePcm16Base64(base64);
      this.setState("speaking");
      return;
    }

    if (frame.eventId === VOLC_SERVER_EVENT.asrInfo) {
      if (this.state === "speaking") {
        await this.interrupt();
      }
    }
  }

  private async startSession(): Promise<void> {
    if (!this.ws || !this.credentials) {
      return;
    }
    this.sessionId = createSessionId();
    this.ws.send(
      encodeJsonClientEvent({
        eventId: VOLC_CLIENT_EVENT.startSession,
        sessionId: this.sessionId,
        payload: buildStartSessionPayload({
          model: this.credentials.model,
        }),
      }),
    );
  }

  private async startMic(): Promise<void> {
    if (!this.ws || !this.sessionId) {
      return;
    }
    const sessionId = this.sessionId;
    await this.mic.start((chunkBase64) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const pcmChunk = Uint8Array.from(atob(chunkBase64), (char) =>
        char.charCodeAt(0),
      );
      this.ws.send(
        encodeAudioTaskRequest({
          sessionId,
          pcmChunk,
        }),
      );
    });
  }

  private cleanupTransport(): void {
    this.mic.stop();
    this.speaker.stopImmediately();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
    }
    this.ws = null;
    this.sessionId = null;
    this.credentials = null;
    this.sessionReady = null;
    this.sessionFailed = null;
  }

  private emitTranscript(event: VoiceTranscriptEvent): void {
    for (const listener of this.transcriptListeners) {
      listener(event);
    }
  }

  private emitSpeakProgress(event: VoiceSpeakProgressEvent): void {
    for (const listener of this.speakProgressListeners) {
      listener(event);
    }
  }

  private fail(message: string): void {
    this.cleanupTransport();
    this.setState("error");
    this.emitTranscript({
      role: "assistant",
      text: message,
      final: true,
    });
  }

  private setState(next: VoiceConnectionState): void {
    this.state = next;
    for (const listener of this.stateListeners) {
      listener(next);
    }
  }
}

export function createVolcengineRealtimeVoiceProvider(): VolcengineRealtimeVoiceProvider {
  return new VolcengineRealtimeVoiceProvider();
}
