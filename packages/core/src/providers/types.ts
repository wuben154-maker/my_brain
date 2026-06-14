import type { ProviderMode } from "../env/types.js";

export type VoiceConnectionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export interface VoiceProvider {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  interrupt(): Promise<void>;
  getState(): VoiceConnectionState;
}

export interface LlmProvider {
  readonly id: string;
  summarize(text: string): Promise<string>;
}

export interface NewsSource {
  readonly id: string;
  fetchHeadlines(): Promise<Array<{ id: string; title: string }>>;
}

export interface ProviderBundle {
  voice: VoiceProvider;
  llm: LlmProvider;
  news: NewsSource;
  modes: {
    voice: ProviderMode;
    llm: ProviderMode;
    newsRadar: ProviderMode;
  };
}
