export type VoiceConnectionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export interface VoiceTranscriptEvent {
  role: "user" | "assistant";
  text: string;
  final: boolean;
}

export interface VoiceProviderConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
}

export interface VoiceProvider {
  readonly id: string;
  connect(config: VoiceProviderConfig): Promise<void>;
  disconnect(): Promise<void>;
  interrupt(): Promise<void>;
  getState(): VoiceConnectionState;
  onStateChange(listener: (state: VoiceConnectionState) => void): () => void;
  onTranscript(listener: (event: VoiceTranscriptEvent) => void): () => void;
}
