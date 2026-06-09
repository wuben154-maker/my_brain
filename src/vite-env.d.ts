/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_OPENAI_LLM_MODEL: string;
  readonly VITE_OPENAI_REALTIME_MODEL: string;
  readonly VITE_VOICE_PROVIDER?: "mock" | "openai-realtime";
  readonly VITE_LLM_PROVIDER?: "mock" | "openai" | "domestic-mock";
  readonly VITE_DOMESTIC_LLM_API_KEY?: string;
  readonly VITE_DOMESTIC_LLM_BASE_URL?: string;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export {};
