/**
 * M4 iOS Share Extension → App Group JSON handoff (scaffold).
 * Extension writes structured payload only; main app consumes on cold/warm start.
 * No API keys, no long-term tokens in App Group payload.
 */

import type { SharePayload } from "@my-brain/core";
import { validateSharePayload } from "@my-brain/core";

/** App Group identifier — must match native entitlements when extension is built. */
export const IOS_SHARE_APP_GROUP_ID = "group.app.mybrain.shared";

/** UserDefaults / file name inside App Group container. */
export const IOS_SHARE_PENDING_PAYLOAD_KEY = "pendingSharePayload";

export type IosAppGroupHandoffResult =
  | { ok: true; payload: SharePayload; raw: unknown }
  | { ok: false; code: "IOS_APP_GROUP_EMPTY" | "IOS_APP_GROUP_MALFORMED"; hint: string };

/**
 * Parse JSON written by Share Extension into App Group.
 * Delegates schema validation to core validateSharePayload.
 */
export function parseIosAppGroupSharePayload(raw: unknown): IosAppGroupHandoffResult {
  if (raw === null || raw === undefined) {
    return { ok: false, code: "IOS_APP_GROUP_EMPTY", hint: "App Group 无待处理分享" };
  }

  const validated = validateSharePayload(raw);
  if (!validated.ok) {
    return {
      ok: false,
      code: "IOS_APP_GROUP_MALFORMED",
      hint: validated.hint,
    };
  }

  if (validated.payload.platform !== "ios") {
    return {
      ok: false,
      code: "IOS_APP_GROUP_MALFORMED",
      hint: "App Group payload platform 须为 ios",
    };
  }

  return { ok: true, payload: validated.payload, raw };
}

/** Example payload shape for Extension → App Group (no secrets). */
export const IOS_APP_GROUP_PAYLOAD_EXAMPLE: SharePayload = {
  platform: "ios",
  payloadKind: "url",
  url: "https://example.com/safari-share",
  title: "Safari 分享",
  sourceApp: "com.apple.mobilesafari",
  capturedAt: "2026-06-15T10:00:00.000Z",
};
