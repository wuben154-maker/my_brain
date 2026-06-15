import { describe, expect, it } from "vitest";

import {
  sharePayloadRejectUserHint,
  validateSharePayload,
} from "./sharePayload.js";

describe("validateSharePayload — M4 App Group / intent schema", () => {
  it("accepts android url payload with https", () => {
    const result = validateSharePayload({
      platform: "android",
      payloadKind: "url",
      url: "https://example.com/article",
      title: "Example",
      sourceApp: "com.android.chrome",
      capturedAt: "2026-06-15T10:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.platform).toBe("android");
      expect(result.payload.payloadKind).toBe("url");
      expect(result.payload.url).toBe("https://example.com/article");
    }
  });

  it("accepts ios image payload with mime", () => {
    const result = validateSharePayload({
      platform: "ios",
      payloadKind: "image",
      mime: "image/png",
      title: "截图",
      capturedAt: "2026-06-15T10:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.mime).toBe("image/png");
    }
  });

  it("accepts ios text payload without url", () => {
    const result = validateSharePayload({
      platform: "ios",
      payloadKind: "text",
      title: "备忘录片段",
      sourceApp: "com.apple.mobilenotes",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects non-object payload", () => {
    const result = validateSharePayload("not-json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_INVALID");
    }
  });

  it("rejects missing platform", () => {
    const result = validateSharePayload({ payloadKind: "url", url: "https://x.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_MISSING_PLATFORM");
    }
  });

  it("rejects missing payloadKind", () => {
    const result = validateSharePayload({ platform: "android", url: "https://x.com" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_MISSING_KIND");
    }
  });

  it("rejects http url for url kind", () => {
    const result = validateSharePayload({
      platform: "android",
      payloadKind: "url",
      url: "http://example.com/insecure",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_URL_INVALID");
      expect(sharePayloadRejectUserHint(result.code)).toContain("https");
    }
  });

  it("rejects credential fields in payload", () => {
    const result = validateSharePayload({
      platform: "ios",
      payloadKind: "text",
      title: "hi",
      apiKey: "sk-secret",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_SECRET_FIELD");
    }
  });

  it("rejects oversized title", () => {
    const result = validateSharePayload({
      platform: "android",
      payloadKind: "text",
      title: "x".repeat(300),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_TITLE_TOO_LONG");
    }
  });

  it("rejects image without mime", () => {
    const result = validateSharePayload({
      platform: "ios",
      payloadKind: "image",
      title: "shot",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_IMAGE_MISSING_MIME");
    }
  });

  it("rejects invalid capturedAt", () => {
    const result = validateSharePayload({
      platform: "android",
      payloadKind: "text",
      title: "t",
      capturedAt: "not-a-date",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_CAPTURED_AT_INVALID");
    }
  });
});
