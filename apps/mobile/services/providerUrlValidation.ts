/** HTTPS-only URL validation for Token Exchange / Execution API — hostname SSRF guard. */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

const PRIVATE_IPV4 =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})$/;

const BLOCKED_SCHEMES = /^(file|data|javascript|ftp):/i;

export type ProviderUrlValidationCode =
  | "INVALID_URL"
  | "HTTPS_REQUIRED"
  | "BLOCKED_HOST"
  | "BLOCKED_SCHEME";

export interface ProviderUrlValidationResult {
  ok: boolean;
  code?: ProviderUrlValidationCode;
  hint?: string;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(normalized)) {
    return true;
  }
  if (normalized.endsWith(".local") || normalized.endsWith(".internal")) {
    return true;
  }
  if (PRIVATE_IPV4.test(normalized)) {
    return true;
  }
  if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  return false;
}

export function validateProviderHttpsUrl(raw: string): ProviderUrlValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, code: "INVALID_URL", hint: "URL 不能为空" };
  }
  if (BLOCKED_SCHEMES.test(trimmed)) {
    return {
      ok: false,
      code: "BLOCKED_SCHEME",
      hint: "不支持 file、data、javascript 等协议",
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: "INVALID_URL", hint: "URL 格式无效" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, code: "HTTPS_REQUIRED", hint: "仅支持 https://" };
  }
  if (isPrivateOrLocalHost(parsed.hostname)) {
    return {
      ok: false,
      code: "BLOCKED_HOST",
      hint: "不允许 localhost 或内网地址",
    };
  }
  return { ok: true };
}

export function summarizeEndpointUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return `${parsed.hostname}${parsed.pathname !== "/" ? parsed.pathname : ""}`;
  } catch {
    return url.slice(0, 48);
  }
}
