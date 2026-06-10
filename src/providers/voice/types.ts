export type VoiceConnectionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export type VoiceTimbre =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

export interface VoiceSpeakProgressEvent {
  text: string;
  chunk?: string;
}

export interface VoiceTranscriptEvent {
  role: "user" | "assistant";
  text: string;
  final: boolean;
}

export interface VoiceProviderConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
  /** Mock-only: skip scripted welcome on connect (companion proactive start owns first utterance). */
  skipWelcomeUtterance?: boolean;
  /** Volcengine realtime — X-Api-App-ID */
  volcAppId?: string;
  /** Volcengine realtime — X-Api-Access-Key */
  volcAccessKey?: string;
  /** Volcengine realtime — optional X-Api-Connect-Id */
  volcConnectId?: string;
}

export interface VoiceProvider {
  readonly id: string;
  connect(config: VoiceProviderConfig): Promise<void>;
  disconnect(): Promise<void>;
  interrupt(): Promise<void>;
  speak(text: string, opts?: { interruptible?: boolean }): Promise<void>;
  setVoice(timbre: VoiceTimbre): void;
  getVoice(): VoiceTimbre;
  getState(): VoiceConnectionState;
  onStateChange(listener: (state: VoiceConnectionState) => void): () => void;
  onTranscript(listener: (event: VoiceTranscriptEvent) => void): () => void;
  onSpeakProgress?(
    listener: (evt: VoiceSpeakProgressEvent) => void,
  ): () => void;
}
