import { describe, expect, it } from "vitest";
import { VolcengineRealtimeVoiceProvider } from "./volcengineRealtimeVoiceProvider";

describe("VolcengineRealtimeVoiceProvider", () => {
  it("builds documented handshake headers without secrets in code", () => {
    const provider = new VolcengineRealtimeVoiceProvider();
    const headers = provider.buildConnectHeaders({
      appId: "app-id-placeholder",
      accessKey: "access-key-placeholder",
      connectId: "connect-id-placeholder",
      model: "2.2.0.0",
    });
    expect(headers["X-Api-App-ID"]).toBe("app-id-placeholder");
    expect(headers["X-Api-Access-Key"]).toBe("access-key-placeholder");
    expect(headers["X-Api-Resource-Id"]).toBe("volc.speech.dialog");
    expect(headers["X-Api-App-Key"]).toBe("PlgvMymc7f3tQnJ6");
    expect(headers["X-Api-Connect-Id"]).toBe("connect-id-placeholder");
  });

  it("fail-fast in browser before opening websocket when credentials valid", async () => {
    const provider = new VolcengineRealtimeVoiceProvider();
    const connectPromise = provider.connect({
      apiKey: "access-key-placeholder",
      volcAppId: "app-id-placeholder",
      volcAccessKey: "access-key-placeholder",
      model: "2.2.0.0",
    });
    if (typeof window !== "undefined") {
      await expect(connectPromise).rejects.toThrow(/Header|浏览器/);
    } else {
      await expect(connectPromise).rejects.toThrow();
    }
  });

  it("supports interrupt while idle without throwing", async () => {
    const provider = new VolcengineRealtimeVoiceProvider();
    await expect(provider.interrupt()).resolves.toBeUndefined();
  });
});
