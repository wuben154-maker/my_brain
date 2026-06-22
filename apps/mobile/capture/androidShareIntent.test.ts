import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANDROID_SHARE_INTENT_FILTER_MANIFEST,
  mapAndroidSendIntentToSharePayload,
} from "./androidShareIntent";

describe("androidShareIntent", () => {
  it("maps text/plain https URL to url payload", () => {
    const result = mapAndroidSendIntentToSharePayload({
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "https://example.com/article",
      sourcePackage: "com.android.chrome",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.platform).toBe("android");
      expect(result.payload.payloadKind).toBe("url");
      expect(result.payload.url).toBe("https://example.com/article");
    }
  });

  it("maps text/plain non-url to text payload", () => {
    const result = mapAndroidSendIntentToSharePayload({
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "创业想法：语音伴侣",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.payloadKind).toBe("text");
    }
  });

  it("maps image/* stream to image payload", () => {
    const result = mapAndroidSendIntentToSharePayload({
      action: "android.intent.action.SEND",
      mimeType: "image/jpeg",
      streamUri: "content://media/external/images/1",
      sourcePackage: "com.google.android.apps.photos",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.payloadKind).toBe("image");
      expect(result.payload.mime).toBe("image/jpeg");
    }
  });

  it("rejects http URLs", () => {
    const result = mapAndroidSendIntentToSharePayload({
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "http://example.com/insecure",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported action", () => {
    const result = mapAndroidSendIntentToSharePayload({
      action: "android.intent.action.VIEW" as "android.intent.action.SEND",
      text: "https://example.com",
    });
    expect(result.ok).toBe(false);
  });
});

describe("android intent filter manifest (app.json)", () => {
  it("declares ACTION_SEND for text/plain and image/*", () => {
    const appJsonPath = join(__dirname, "..", "app.json");
    const appJson = JSON.parse(readFileSync(appJsonPath, "utf8")) as {
      expo?: { android?: { intentFilters?: Array<{ action?: string; data?: Array<{ mimeType?: string }> }> } };
    };
    const filters = appJson.expo?.android?.intentFilters ?? [];
    const sendFilters = filters.filter((f) => f.action === "SEND");
    expect(sendFilters.length).toBeGreaterThanOrEqual(2);

    const mimeTypes = sendFilters.flatMap((f) => (f.data ?? []).map((d) => d.mimeType));
    expect(mimeTypes).toContain("text/plain");
    expect(mimeTypes).toContain("image/*");

    expect(ANDROID_SHARE_INTENT_FILTER_MANIFEST.mimeTypes).toContain("text/plain");
    expect(ANDROID_SHARE_INTENT_FILTER_MANIFEST.mimeTypes).toContain("image/*");
  });
});
