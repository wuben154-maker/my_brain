import { describe, expect, it } from "vitest";

import {
  IOS_APP_GROUP_PAYLOAD_EXAMPLE,
  IOS_SHARE_APP_GROUP_ID,
  parseIosAppGroupSharePayload,
} from "./iosAppGroupShare";

describe("iosAppGroupShare", () => {
  it("parses valid App Group payload", () => {
    const result = parseIosAppGroupSharePayload(IOS_APP_GROUP_PAYLOAD_EXAMPLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.platform).toBe("ios");
      expect(result.payload.url).toBe("https://example.com/safari-share");
    }
  });

  it("rejects empty App Group handoff", () => {
    const result = parseIosAppGroupSharePayload(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("IOS_APP_GROUP_EMPTY");
    }
  });

  it("rejects secret fields in App Group JSON", () => {
    const result = parseIosAppGroupSharePayload({
      platform: "ios",
      payloadKind: "text",
      title: "hi",
      token: "long-lived-secret",
    });
    expect(result.ok).toBe(false);
  });

  it("documents App Group id for native entitlements", () => {
    expect(IOS_SHARE_APP_GROUP_ID).toBe("group.app.mybrain.shared");
  });
});
