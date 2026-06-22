/**
 * M4 Android ACTION_SEND intent → SharePayload bridge (scaffold).
 * Native layer delivers structured extras; JS maps into intakeSharePayload.
 * No secrets, no permanent node writes.
 */

import type { SharePayload, SharePayloadKind } from "@my-brain/core";

/** Documented bridge shape from Android MainActivity / ShareActivity intent extras. */
export interface AndroidSendIntentExtras {
  action: "android.intent.action.SEND";
  /** Intent MIME type, e.g. text/plain or image/png */
  mimeType?: string;
  /** EXTRA_TEXT — plain text or https URL */
  text?: string;
  /** EXTRA_SUBJECT */
  subject?: string;
  /** content:// URI string for EXTRA_STREAM (image share) */
  streamUri?: string;
  /** Package name of sending app, when available */
  sourcePackage?: string;
  capturedAt?: string;
}

export type AndroidIntentMapResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; code: "ANDROID_INTENT_MALFORMED" | "ANDROID_INTENT_UNSUPPORTED"; hint: string };

function inferPayloadKind(mimeType: string | undefined, text: string | undefined, streamUri: string | undefined): SharePayloadKind | null {
  if (streamUri || (mimeType && mimeType.startsWith("image/"))) {
    return "image";
  }
  const trimmed = text?.trim() ?? "";
  if (trimmed.startsWith("https://")) {
    return "url";
  }
  if (trimmed.length > 0 || mimeType === "text/plain") {
    return "text";
  }
  return null;
}

function extractHttpsUrl(text: string): string | undefined {
  const trimmed = text.trim();
  if (/^http:\/\//i.test(trimmed)) {
    return undefined;
  }
  const match = trimmed.match(/^https:\/\/[^\s]+/);
  return match?.[0];
}

/**
 * Map Android ACTION_SEND extras into core SharePayload for provisional intake.
 * Rejects non-https URLs and malformed extras before UrlFetchGuard runs.
 */
export function mapAndroidSendIntentToSharePayload(extras: AndroidSendIntentExtras): AndroidIntentMapResult {
  if (extras.action !== "android.intent.action.SEND") {
    return {
      ok: false,
      code: "ANDROID_INTENT_UNSUPPORTED",
      hint: "仅支持 ACTION_SEND 分享入口",
    };
  }

  const kind = inferPayloadKind(extras.mimeType, extras.text, extras.streamUri);
  if (!kind) {
    return {
      ok: false,
      code: "ANDROID_INTENT_MALFORMED",
      hint: "分享内容为空或 MIME 不受支持",
    };
  }

  const capturedAt = extras.capturedAt ?? new Date().toISOString();
  const sourceApp = extras.sourcePackage;
  const title = extras.subject?.trim() || undefined;

  if (kind === "url") {
    const url = extractHttpsUrl(extras.text ?? "");
    if (!url) {
      return {
        ok: false,
        code: "ANDROID_INTENT_MALFORMED",
        hint: "链接分享须为 https URL",
      };
    }
    return {
      ok: true,
      payload: {
        platform: "android",
        payloadKind: "url",
        url,
        title: title ?? url,
        sourceApp,
        capturedAt,
      },
    };
  }

  if (kind === "image") {
    const mime = extras.mimeType?.startsWith("image/") ? extras.mimeType : "image/*";
    return {
      ok: true,
      payload: {
        platform: "android",
        payloadKind: "image",
        url: extras.streamUri,
        mime,
        title: title ?? "相册分享",
        sourceApp,
        capturedAt,
      },
    };
  }

  const text = extras.text?.trim() ?? "";
  if (!text) {
    return {
      ok: false,
      code: "ANDROID_INTENT_MALFORMED",
      hint: "文字分享内容为空",
    };
  }

  if (/^https?:\/\//i.test(text) && !text.startsWith("https://")) {
    return {
      ok: false,
      code: "ANDROID_INTENT_MALFORMED",
      hint: "链接分享须为 https URL",
    };
  }

  return {
    ok: true,
    payload: {
      platform: "android",
      payloadKind: "text",
      title: title ?? text.slice(0, 256),
      sourceApp,
      capturedAt,
    },
  };
}

/** Expo app.json intent filter metadata — auditable static contract. */
export const ANDROID_SHARE_INTENT_FILTER_MANIFEST = {
  action: "SEND",
  categories: ["DEFAULT"],
  mimeTypes: ["text/plain", "image/*"],
} as const;
