import { create } from "zustand";
import type { NewsItem } from "@/domain/news";
import type { AppProviders } from "@/providers";
import type { StorageProvider } from "@/storage/types";

export type LaunchPhase =
  | "boot"
  | "self_check"
  | "loading"
  | "companion"
  | "error";

export type BootCheckStatus = "pending" | "syncing" | "ok" | "warn";

export interface SelfCheckItem {
  id: string;
  label: string;
  status: BootCheckStatus;
  detail?: string;
}

interface AppState {
  phase: LaunchPhase;
  selfChecks: SelfCheckItem[];
  bootProgress: number;
  bootLogs: string[];
  loadingMessage: string;
  newsQueue: NewsItem[];
  errorMessage: string | null;
  providers: AppProviders | null;
  storage: StorageProvider | null;
  setPhase: (phase: LaunchPhase) => void;
  setSelfChecks: (items: SelfCheckItem[]) => void;
  setSelfCheckStatus: (
    id: string,
    status: BootCheckStatus,
    detail?: string,
  ) => void;
  appendBootLog: (line: string) => void;
  setBootProgress: (progress: number) => void;
  resetBoot: () => void;
  setLoadingMessage: (message: string) => void;
  setNewsQueue: (items: NewsItem[]) => void;
  setError: (message: string) => void;
  setProviders: (providers: AppProviders) => void;
  setStorage: (storage: StorageProvider) => void;
}

export const useAppStore = create<AppState>((set) => ({
  phase: "boot",
  selfChecks: [],
  bootProgress: 0,
  bootLogs: [],
  loadingMessage: "正在唤醒大脑…",
  newsQueue: [],
  errorMessage: null,
  providers: null,
  storage: null,
  setPhase: (phase) => set({ phase }),
  setSelfChecks: (selfChecks) => set({ selfChecks }),
  setSelfCheckStatus: (id, status, detail) =>
    set((state) => ({
      selfChecks: state.selfChecks.map((item) =>
        item.id === id ? { ...item, status, detail } : item,
      ),
    })),
  appendBootLog: (line) =>
    set((state) => ({ bootLogs: [...state.bootLogs, line] })),
  setBootProgress: (bootProgress) => set({ bootProgress }),
  resetBoot: () =>
    set({
      phase: "self_check",
      bootProgress: 0,
      bootLogs: [],
      selfChecks: [],
      errorMessage: null,
    }),
  setLoadingMessage: (loadingMessage) => set({ loadingMessage }),
  setNewsQueue: (newsQueue) => set({ newsQueue }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  setProviders: (providers) => set({ providers }),
  setStorage: (storage) => set({ storage }),
}));
