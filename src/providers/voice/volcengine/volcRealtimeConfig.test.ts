import { describe, expect, it } from "vitest";
import { ProviderConfigError } from "@/providers/providerConfigError";
import {
  resolveVolcRealtimeCredentials,
  resolveVolcRealtimeModel,
  volcNativeTransportRequiredMessage,
  volcRealtimeRequiresNativeTransport,
} from "./volcRealtimeConfig";

describe("volcRealtimeConfig", () => {
  it("throws MISSING_API_KEY when credentials missing", () => {
    expect(() => resolveVolcRealtimeCredentials({})).toThrow(ProviderConfigError);
    try {
      resolveVolcRealtimeCredentials({ volcAppId: "app", volcAccessKey: "" });
    } catch (error) {
      expect(error).toMatchObject({ code: "MISSING_API_KEY" });
      expect(String(error)).toContain("VITE_VOLC_APP_ID");
    }
  });

  it("resolves documented default model version", () => {
    expect(resolveVolcRealtimeModel(undefined)).toBe("2.2.0.0");
    expect(resolveVolcRealtimeModel("1.2.1.1")).toBe("1.2.1.1");
    expect(resolveVolcRealtimeModel("invalid")).toBe("2.2.0.0");
  });

  it("returns credentials when env present", () => {
    const creds = resolveVolcRealtimeCredentials({
      volcAppId: "123",
      volcAccessKey: "token",
      volcRealtimeModel: "2.2.0.0",
    });
    expect(creds.appId).toBe("123");
    expect(creds.accessKey).toBe("token");
    expect(creds.model).toBe("2.2.0.0");
  });

  it("documents browser native transport requirement", () => {
    const inBrowser = typeof window !== "undefined";
    expect(volcRealtimeRequiresNativeTransport()).toBe(inBrowser);
    expect(volcNativeTransportRequiredMessage()).toContain("Header");
  });
});
