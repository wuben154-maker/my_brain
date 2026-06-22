import { describe, expect, it, vi } from "vitest";

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        tokenExchangeUrl: "https://staging.example/token",
        voiceProviderMode: "mock",
      },
    },
  },
}));

import { readMobileAppEnv } from "./readAppEnv";

describe("readMobileAppEnv", () => {
  it("reads non-secret tokenExchangeUrl from Expo extra", () => {
    const env = readMobileAppEnv();
    expect(env.runtime).toBe("mobile");
    expect(env.tokenExchangeUrl).toBe("https://staging.example/token");
    expect(env.providerModes.voice).toBe("mock");
  });
});
