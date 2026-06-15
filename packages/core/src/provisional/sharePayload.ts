/**
 * M4 share payload schema — App Group (iOS) / intent extras (Android).
 * Structured only: no long-term keys, no full article/body persistence in validator output.
 */

export type SharePlatform = "android" | "ios";

export type SharePayloadKind = "url" | "text" | "image";

export type SharePayloadRejectCode =
  | "SHARE_PAYLOAD_INVALID"
  | "SHARE_PAYLOAD_MISSING_PLATFORM"
  | "SHARE_PAYLOAD_MISSING_KIND"
  | "SHARE_PAYLOAD_SECRET_FIELD"
  | "SHARE_PAYLOAD_TITLE_TOO_LONG"
  | "SHARE_PAYLOAD_URL_INVALID"
  | "SHARE_PAYLOAD_IMAGE_MISSING_MIME"
  | "SHARE_PAYLOAD_CAPTURED_AT_INVALID";

export interface SharePayload {
  /** https link when payloadKind is url; optional for text/image. */
  url?: string;
  /** Short title — not full article body. */
  title?: string;
  mime?: string;
  sourceApp?: string;
  capturedAt?: string;
  platform: SharePlatform;
  payloadKind: SharePayloadKind;
}

export interface ValidatedSharePayload extends SharePayload {
  platform: SharePlatform;
  payloadKind: SharePayloadKind;
}

export type SharePayloadValidationResult =
  | { ok: true; payload: ValidatedSharePayload }
  | { ok: false; code: SharePayloadRejectCode; hint: string };

const SECRET_FIELD_PATTERN =
  /^(api[_-]?key|token|secret|password|authorization|bearer)$/i;

const MAX_TITLE_LEN = 256;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reject(
  code: SharePayloadRejectCode,
  hint: string,
): SharePayloadValidationResult {
  return { ok: false, code, hint };
}

function hasSecretFields(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => SECRET_FIELD_PATTERN.test(k));
}

function parsePlatform(value: unknown): SharePlatform | null {
  if (value === "android" || value === "ios") {
    return value;
  }
  return null;
}

function parsePayloadKind(value: unknown): SharePayloadKind | null {
  if (value === "url" || value === "text" || value === "image") {
    return value;
  }
  return null;
}

function parseOptionalString(value: unknown, maxLen?: number): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (maxLen !== undefined && trimmed.length > maxLen) {
    return undefined;
  }
  return trimmed;
}

function isHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidCapturedAt(value: string): boolean {
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

/** Validate raw App Group / intent JSON — rejects malformed and secret-bearing payloads. */
export function validateSharePayload(raw: unknown): SharePayloadValidationResult {
  if (!isRecord(raw)) {
    return reject("SHARE_PAYLOAD_INVALID", "payload must be a JSON object");
  }

  if (hasSecretFields(raw)) {
    return reject("SHARE_PAYLOAD_SECRET_FIELD", "payload must not contain credential fields");
  }

  const platform = parsePlatform(raw.platform);
  if (!platform) {
    return reject("SHARE_PAYLOAD_MISSING_PLATFORM", "platform must be android or ios");
  }

  const payloadKind = parsePayloadKind(raw.payloadKind);
  if (!payloadKind) {
    return reject("SHARE_PAYLOAD_MISSING_KIND", "payloadKind must be url, text, or image");
  }

  const titleRaw = raw.title;
  if (titleRaw !== undefined && titleRaw !== null) {
    if (typeof titleRaw !== "string") {
      return reject("SHARE_PAYLOAD_INVALID", "title must be a string");
    }
    if (titleRaw.trim().length > MAX_TITLE_LEN) {
      return reject("SHARE_PAYLOAD_TITLE_TOO_LONG", `title must be ≤${MAX_TITLE_LEN} chars`);
    }
  }

  const capturedAt = parseOptionalString(raw.capturedAt);
  if (raw.capturedAt !== undefined && raw.capturedAt !== null && !capturedAt) {
    return reject("SHARE_PAYLOAD_CAPTURED_AT_INVALID", "capturedAt must be ISO-8601 string");
  }
  if (capturedAt && !isValidCapturedAt(capturedAt)) {
    return reject("SHARE_PAYLOAD_CAPTURED_AT_INVALID", "capturedAt must be ISO-8601 string");
  }

  const url = parseOptionalString(raw.url);
  const mime = parseOptionalString(raw.mime);
  const sourceApp = parseOptionalString(raw.sourceApp, 64);
  const title = parseOptionalString(raw.title, MAX_TITLE_LEN);

  if (payloadKind === "url") {
    if (!url) {
      return reject("SHARE_PAYLOAD_URL_INVALID", "url kind requires https url");
    }
    if (!isHttpsUrl(url)) {
      return reject("SHARE_PAYLOAD_URL_INVALID", "url must use https scheme");
    }
  }

  if (payloadKind === "image" && !mime) {
    return reject("SHARE_PAYLOAD_IMAGE_MISSING_MIME", "image kind requires mime");
  }

  if (url && !isHttpsUrl(url)) {
    return reject("SHARE_PAYLOAD_URL_INVALID", "optional url must use https scheme");
  }

  const payload: ValidatedSharePayload = {
    platform,
    payloadKind,
    ...(title ? { title } : {}),
    ...(url ? { url } : {}),
    ...(mime ? { mime } : {}),
    ...(sourceApp ? { sourceApp } : {}),
    ...(capturedAt ? { capturedAt } : {}),
  };

  return { ok: true, payload };
}

export function sharePayloadRejectUserHint(code: SharePayloadRejectCode): string {
  switch (code) {
    case "SHARE_PAYLOAD_SECRET_FIELD":
      return "分享内容含敏感字段，已拒绝";
    case "SHARE_PAYLOAD_URL_INVALID":
      return "仅支持 https 链接分享";
    case "SHARE_PAYLOAD_TITLE_TOO_LONG":
      return "标题过长，请缩短后重试";
    case "SHARE_PAYLOAD_IMAGE_MISSING_MIME":
      return "图片分享缺少类型信息";
    case "SHARE_PAYLOAD_MISSING_PLATFORM":
    case "SHARE_PAYLOAD_MISSING_KIND":
    case "SHARE_PAYLOAD_CAPTURED_AT_INVALID":
    case "SHARE_PAYLOAD_INVALID":
    default:
      return "分享内容格式无效";
  }
}
