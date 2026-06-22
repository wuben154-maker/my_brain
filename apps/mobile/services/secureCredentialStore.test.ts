import { describe, expect, it } from "vitest";

import {
  createMemorySecureCredentialStore,
  maskCredentialLast4,
} from "./secureCredentialStore";

describe("secureCredentialStore (S14)", () => {
  it("stores credentials in memory adapter without exposing full key in last4 display", async () => {
    const store = createMemorySecureCredentialStore();
    await store.set("llm_api_key", "sk-test-secret-key-1234");
    expect(await store.has("llm_api_key")).toBe(true);
    expect(await store.getLast4("llm_api_key")).toBe("1234");
    expect(maskCredentialLast4(await store.getLast4("llm_api_key"))).toBe("••••1234");
    expect(maskCredentialLast4(null)).toBe("未配置");
  });

  it("does not persist voice key in plain meta storage path", async () => {
    const store = createMemorySecureCredentialStore();
    await store.set("voice_api_key", "voice-secret-5678");
    const last4 = await store.getLast4("voice_api_key");
    expect(last4).toBe("5678");
    expect(last4).not.toContain("voice-secret");
  });

  it("delete removes credential presence", async () => {
    const store = createMemorySecureCredentialStore();
    await store.set("llm_api_key", "sk-abcd");
    await store.delete("llm_api_key");
    expect(await store.has("llm_api_key")).toBe(false);
  });
});
