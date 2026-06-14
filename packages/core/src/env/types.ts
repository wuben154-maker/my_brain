export type AppRuntime = "web" | "tauri" | "mobile";

export type ProviderMode = "mock" | "live" | "degraded";

export interface AppEnv {
  runtime: AppRuntime;
  /** Non-secret feature flags and provider mode hints — populated by shell adapters. */
  providerModes: {
    voice: ProviderMode;
    llm: ProviderMode;
    newsRadar: ProviderMode;
  };
}
