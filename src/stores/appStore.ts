import { create } from "zustand";
import type { NewsItem } from "@/domain/news";
import type { AppProviders } from "@/providers";
import type { StorageProvider } from "@/storage/types";

export type LaunchPhase =
  | "self_check"
  | "loading"
  | "ready"
  | "onboarding"
  | "error";

export interface SelfCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

interface AppState {
  phase: LaunchPhase;
  selfChecks: SelfCheckItem[];
  loadingMessage: string;
  newsQueue: NewsItem[];
  errorMessage: string | null;
  providers: AppProviders | null;
  storage: StorageProvider | null;
  setPhase: (phase: LaunchPhase) => void;
  setSelfChecks: (items: SelfCheckItem[]) => void;
  setLoadingMessage: (message: string) => void;
  setNewsQueue: (items: NewsItem[]) => void;
  setError: (message: string) => void;
  setProviders: (providers: AppProviders) => void;
  setStorage: (storage: StorageProvider) => void;
}

export const useAppStore = create<AppState>((set) => ({
  phase: "self_check",
  selfChecks: [],
  loadingMessage: "正在唤醒大脑…",
  newsQueue: [],
  errorMessage: null,
  providers: null,
  storage: null,
  setPhase: (phase) => set({ phase }),
  setSelfChecks: (selfChecks) => set({ selfChecks }),
  setLoadingMessage: (loadingMessage) => set({ loadingMessage }),
  setNewsQueue: (newsQueue) => set({ newsQueue }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  setProviders: (providers) => set({ providers }),
  setStorage: (storage) => set({ storage }),
}));
