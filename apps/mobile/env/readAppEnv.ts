import Constants from "expo-constants";

import { DEFAULT_APP_ENV, type AppEnv } from "@my-brain/core";

function readExtraString(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== "object") {
    return undefined;
  }
  const value = (extra as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Mobile shell env — reads Expo Constants extra only; never process.env or import.meta. */
export function readMobileAppEnv(): AppEnv {
  const tokenExchangeUrl = readExtraString("tokenExchangeUrl");
  const voiceMode = readExtraString("voiceProviderMode");
  const providerModes = { ...DEFAULT_APP_ENV.providerModes };
  if (voiceMode === "mock" || voiceMode === "live" || voiceMode === "degraded") {
    providerModes.voice = voiceMode;
  }

  return {
    runtime: "mobile",
    providerModes,
    ...(tokenExchangeUrl ? { tokenExchangeUrl } : {}),
  };
}
