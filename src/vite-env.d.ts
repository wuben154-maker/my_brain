/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_OPENAI_LLM_MODEL: string;
  readonly VITE_OPENAI_REALTIME_MODEL: string;
  readonly VITE_VOICE_PROVIDER?: "mock" | "openai-realtime" | "volc-realtime";
  readonly VITE_LLM_PROVIDER?: "mock" | "openai" | "domestic-mock" | "modelscope";
  readonly VITE_DOMESTIC_LLM_API_KEY?: string;
  readonly VITE_DOMESTIC_LLM_BASE_URL?: string;
  readonly VITE_MODELSCOPE_API_KEY?: string;
  readonly VITE_MODELSCOPE_BASE_URL?: string;
  readonly VITE_MODELSCOPE_LLM_MODEL?: string;
  readonly VITE_VOLC_APP_ID?: string;
  readonly VITE_VOLC_ACCESS_KEY?: string;
  readonly VITE_VOLC_CONNECT_ID?: string;
  readonly VITE_VOLC_REALTIME_MODEL?: string;
  readonly VITE_NEWS_LIVE_FETCH?: "0" | "1";
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export {};
