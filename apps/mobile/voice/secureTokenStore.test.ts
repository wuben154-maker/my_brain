import { describe, expect, it, vi } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

import * as SecureStore from "expo-secure-store";

import {
  createExpoSecureTokenStore,
  createMemorySecureTokenStore,
  voiceTokenStorageKey,
} from "./secureTokenStore";

describe("secureTokenStore", () => {
  it("memory adapter round-trips without disk", async () => {
    const store = createMemorySecureTokenStore();
    await store.set(voiceTokenStorageKey(), {
      accessToken: "short",
      expiresAt: new Date().toISOString(),
    });
    const got = await store.get(voiceTokenStorageKey());
    expect(got?.accessToken).toBe("short");
  });

  it("expo adapter persists JSON via SecureStore", async () => {
    const store = createExpoSecureTokenStore();
    const record = {
      accessToken: "secure-token",
      expiresAt: new Date().toISOString(),
    };
    await store.set(voiceTokenStorageKey(), record);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      voiceTokenStorageKey(),
      JSON.stringify(record),
    );
  });
});
