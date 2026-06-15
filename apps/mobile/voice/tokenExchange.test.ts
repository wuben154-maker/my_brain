import { describe, expect, it } from "vitest";

import { TokenExchangeError } from "@my-brain/core";

import {
  createMockTokenExchangeClient,
  createStagingTokenExchangeClient,
} from "./tokenExchangeClient";
import { createMemorySecureTokenStore, voiceTokenStorageKey } from "./secureTokenStore";

describe("token exchange client", () => {
  it("mock client returns short-lived token without long-term key", async () => {
    const client = createMockTokenExchangeClient();
    const result = await client.exchange("device-xyz");
    expect(result.accessToken).toMatch(/^mock-voice-/);
    expect(result.ttlSeconds).toBe(900);
    expect(result.expiresAt).toBeTruthy();
  });

  it("staging client fails closed without URL", async () => {
    const client = createStagingTokenExchangeClient(undefined);
    await expect(client.exchange("device-xyz")).rejects.toThrow(TokenExchangeError);
  });

  it("secure store holds token ephemerally in memory adapter", async () => {
    const store = createMemorySecureTokenStore();
    await store.set(voiceTokenStorageKey(), {
      accessToken: "short",
      expiresAt: new Date().toISOString(),
    });
    const got = await store.get(voiceTokenStorageKey());
    expect(got?.accessToken).toBe("short");
  });
});
