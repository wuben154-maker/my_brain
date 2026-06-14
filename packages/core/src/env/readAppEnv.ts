import type { AppEnv } from "./types.js";

/**
 * Cross-platform env reader port — shells inject implementation.
 * Core must never read shell-specific env globals (Vite/Tauri/Expo Constants).
 */
export type ReadAppEnv = () => AppEnv;

export const DEFAULT_APP_ENV: AppEnv = {
  runtime: "mobile",
  providerModes: {
    voice: "mock",
    llm: "mock",
    newsRadar: "mock",
  },
};
