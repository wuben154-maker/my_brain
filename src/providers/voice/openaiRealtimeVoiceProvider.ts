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

const REALTIME_URL = "wss://api.openai.com/v1/realtime";
const DEFAULT_MODEL = "gpt-4o-realtime-preview";
const DEFAULT_INSTRUCTIONS =
  "你是 my_brain，用户的 AI 大脑伴侣。用自然的中文口语交流，技术术语保留英文原词。回答简洁，像朋友聊天。用户可以随时打断你，被打断后立即停止并倾听。";

type RealtimeEvent = {
  type: string;
  delta?: string;
  transcript?: string;
  response?: { id?: string };
  error?: { message?: string };
};

export class OpenAiRealtimeVoiceProvider implements VoiceProvider {
  readonly id = "openai-realtime";

  private state: VoiceConnectionState = "idle";
  private stateListeners = new Set<(state: VoiceConnectionState) => void>();
  private transcriptListeners = new Set<
    (event: VoiceTranscriptEvent) => void
  >();

  private ws: WebSocket | null = null;
  private mic = new MicCapture();
  private speaker = new SpeakerPlayback();
  private assistantTranscript = "";
  private responseInFlight = false;
  private timbre: VoiceTimbre = "alloy";
  private speakProgressListeners = new Set<
    (evt: VoiceSpeakProgressEvent) => void
  >();

  async connect(config: VoiceProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error("缺少 OpenAI API Key");
    }
    if (this.ws) {
      await this.disconnect();
    }

    this.setState("connecting");

    const model = config.model ?? DEFAULT_MODEL;
    const url = `${REALTIME_URL}?model=${encodeURIComponent(model)}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, [
        "realtime",
        `openai-insecure-api-key.${config.apiKey}`,
        "openai-beta.realtime-v1",
      ]);

      this.ws = ws;

      ws.onopen = () => {
        this.sendEvent({
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: config.instructions ?? DEFAULT_INSTRUCTIONS,
            voice: this.timbre,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
            },
          },
        });
      };

      ws.onmessage = (message) => {
        void this.handleServerEvent(JSON.parse(String(message.data)) as RealtimeEvent);
      };

      ws.onerror = () => {
        this.fail("Realtime 连接失败，请检查 API Key 与网络");
        reject(new Error("Realtime WebSocket error"));
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
    this.cleanupTransport();
    this.setState("idle");
  }

  async interrupt(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.cancelInFlightResponse();
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emitSpeakProgress({ text: trimmed, chunk: trimmed });
      this.emitTranscript({ role: "assistant", text: trimmed, final: true });
      return;
    }
    this.cancelInFlightResponse();
    this.responseInFlight = true;
    this.setState("speaking");
    this.sendEvent({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: trimmed,
      },
    });
    this.emitSpeakProgress({ text: trimmed, chunk: trimmed });
  }

  setVoice(timbre: VoiceTimbre): void {
    this.timbre = timbre;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendEvent({
        type: "session.update",
        session: { voice: timbre },
      });
    }
  }

  getVoice(): VoiceTimbre {
    return this.timbre;
  }

  onSpeakProgress(
    listener: (evt: VoiceSpeakProgressEvent) => void,
  ): () => void {
    this.speakProgressListeners.add(listener);
    return () => this.speakProgressListeners.delete(listener);
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

  private async handleServerEvent(event: RealtimeEvent): Promise<void> {
    switch (event.type) {
      case "session.updated":
        await this.startMic();
        this.setState("listening");
        this.sessionReady?.();
        this.sessionReady = null;
        this.sessionFailed = null;
        break;

      case "input_audio_buffer.speech_started":
        if (this.state === "speaking") {
          await this.interrupt();
        }
        break;

      case "response.created":
        this.assistantTranscript = "";
        this.setState("speaking");
        break;

      case "response.audio.delta":
        if (event.delta) {
          await this.speaker.enqueuePcm16Base64(String(event.delta));
          if (this.state !== "speaking") {
            this.setState("speaking");
          }
        }
        break;

      case "response.audio_transcript.delta":
        if (event.delta) {
          this.assistantTranscript += String(event.delta);
          this.emitTranscript({
            role: "assistant",
            text: this.assistantTranscript,
            final: false,
          });
        }
        break;

      case "response.audio_transcript.done":
        if (event.transcript) {
          this.emitTranscript({
            role: "assistant",
            text: String(event.transcript),
            final: true,
          });
        }
        break;

      case "response.done":
      case "response.cancelled":
        this.responseInFlight = false;
        this.assistantTranscript = "";
        if (this.state !== "error") {
          this.setState("listening");
        }
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          this.emitTranscript({
            role: "user",
            text: String(event.transcript),
            final: true,
          });
        }
        break;

      case "error":
        this.fail(event.error?.message ?? "Realtime 会话出错");
        this.sessionFailed?.(new Error(String(event.error?.message ?? "Realtime error")));
        this.sessionFailed = null;
        this.sessionReady = null;
        break;

      default:
        break;
    }
  }

  private async startMic(): Promise<void> {
    await this.mic.start((chunk) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      this.sendEvent({
        type: "input_audio_buffer.append",
        audio: chunk,
      });
    });
  }

  private sendEvent(event: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify(event));
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
    this.assistantTranscript = "";
    this.responseInFlight = false;
    this.sessionReady = null;
    this.sessionFailed = null;
  }

  /** Stop any assistant response before starting a new speak (barge-in / stop-then-speak). */
  private cancelInFlightResponse(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (this.responseInFlight || this.state === "speaking") {
      this.speaker.stopImmediately();
      this.sendEvent({ type: "response.cancel" });
    }
    this.responseInFlight = false;
    this.assistantTranscript = "";
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
