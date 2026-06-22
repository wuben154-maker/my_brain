/** M4 SSRF allowlist — all outbound URL fetches must pass through this guard. */

export type SsrfRejectCode =
  | "SSRF_SCHEME_DENIED"
  | "SSRF_PORT_DENIED"
  | "SSRF_HOST_DENIED"
  | "SSRF_PRIVATE_IP"
  | "SSRF_DNS_PRIVATE"
  | "SSRF_DNS_FAILED"
  | "SSRF_REDIRECT_LIMIT"
  | "SSRF_REDIRECT_FINAL_DENIED"
  | "SSRF_FETCH_TIMEOUT"
  | "SSRF_RESPONSE_TOO_LARGE";

export type UrlFetchOk = { ok: true; finalUrl: string; body: Uint8Array };
export type UrlFetchFail = { ok: false; code: SsrfRejectCode; hint: string };
export type UrlFetchResult = UrlFetchOk | UrlFetchFail;

export const DEFAULT_FETCH_TIMEOUT_MS = 5_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 512 * 1024;
export const DEFAULT_MAX_REDIRECTS = 3;

export interface UrlFetchGuardOptions {
  followRedirects?: boolean;
  maxRedirects?: number;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface MockFetchResponse {
  status: number;
  headers?: Record<string, string>;
  body: Uint8Array;
  /** When set, simulates a redirect Location header. */
  redirectUrl?: string;
}

export interface UrlFetchGuardDeps {
  /** Injectable DNS resolver — tests supply deterministic A/AAAA answers. */
  resolveDns?: (host: string) => Promise<string[]>;
  /** Injectable fetch — tests supply mock responses; no real network. */
  fetch?: (url: string, init?: { signal?: AbortSignal }) => Promise<MockFetchResponse>;
}

function isIpv4Literal(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function isIpv6Literal(host: string): boolean {
  const h = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  return h.includes(":") && !h.includes(".");
}

function ipv4ToInt(octets: number[]): number {
  return ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
}

function isPrivateIpv4(host: string): boolean {
  if (!isIpv4Literal(host)) {
    return false;
  }
  const octets = host.split(".").map(Number);
  const n = ipv4ToInt(octets);
  // 127.0.0.0/8
  if ((n & 0xff000000) === 0x7f000000) {
    return true;
  }
  // 10.0.0.0/8
  if ((n & 0xff000000) === 0x0a000000) {
    return true;
  }
  // 172.16.0.0/12
  if ((n & 0xfff00000) === 0xac100000) {
    return true;
  }
  // 192.168.0.0/16
  if ((n & 0xffff0000) === 0xc0a80000) {
    return true;
  }
  // 169.254.0.0/16 link-local
  if ((n & 0xffff0000) === 0xa9fe0000) {
    return true;
  }
  // 100.64.0.0/10 CGNAT
  if ((n & 0xffc00000) === 0x64400000) {
    return true;
  }
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  const lower = h.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") {
    return true;
  }
  // fc00::/7 unique local
  if (lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  // fe80::/10 link-local
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }
  return false;
}

function isBlockedHostname(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "localhost") {
    return true;
  }
  if (lower.endsWith(".local") || lower.endsWith(".internal")) {
    return true;
  }
  return false;
}

export function validateUrlAllowlist(rawUrl: string): UrlFetchFail | { ok: true; url: URL } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, code: "SSRF_SCHEME_DENIED", hint: "Malformed URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, code: "SSRF_SCHEME_DENIED", hint: `Scheme not allowed: ${parsed.protocol}` };
  }

  const port = parsed.port === "" ? 443 : Number(parsed.port);
  if (port !== 443) {
    return { ok: false, code: "SSRF_PORT_DENIED", hint: `Port not allowed: ${port}` };
  }

  const host = parsed.hostname;
  if (isIpv4Literal(host) || isIpv6Literal(host)) {
    return { ok: false, code: "SSRF_HOST_DENIED", hint: "IP literal hosts are not allowed" };
  }
  if (isBlockedHostname(host)) {
    return { ok: false, code: "SSRF_HOST_DENIED", hint: `Blocked hostname: ${host}` };
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    return { ok: false, code: "SSRF_PRIVATE_IP", hint: `Private host: ${host}` };
  }

  return { ok: true, url: parsed };
}

async function resolveAndCheckDns(
  host: string,
  resolveDns: (host: string) => Promise<string[]>,
): Promise<UrlFetchFail | null> {
  let addresses: string[];
  try {
    addresses = await resolveDns(host);
  } catch {
    return { ok: false, code: "SSRF_DNS_FAILED", hint: `DNS resolution failed for ${host}` };
  }
  if (addresses.length === 0) {
    return { ok: false, code: "SSRF_DNS_FAILED", hint: `No DNS records for ${host}` };
  }
  for (const addr of addresses) {
    if (isPrivateIpv4(addr) || isPrivateIpv6(addr)) {
      return { ok: false, code: "SSRF_DNS_PRIVATE", hint: `DNS resolved to private IP: ${addr}` };
    }
  }
  return null;
}

export async function guardedUrlFetch(
  rawUrl: string,
  opts: UrlFetchGuardOptions = {},
  deps: UrlFetchGuardDeps = {},
): Promise<UrlFetchResult> {
  const followRedirects = opts.followRedirects ?? true;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxResponseBytes = opts.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  const resolveDns =
    deps.resolveDns ??
    (async () => {
      throw new Error("resolveDns not injected");
    });
  const fetchFn =
    deps.fetch ??
    (async () => {
      throw new Error("fetch not injected");
    });

  let currentUrl = rawUrl;
  let redirectCount = 0;

  while (true) {
    const allow = validateUrlAllowlist(currentUrl);
    if (!allow.ok) {
      return redirectCount > 0
        ? { ok: false, code: "SSRF_REDIRECT_FINAL_DENIED", hint: allow.hint }
        : allow;
    }

    const dnsFail = await resolveAndCheckDns(allow.url.hostname, resolveDns);
    if (dnsFail) {
      return redirectCount > 0
        ? { ok: false, code: "SSRF_REDIRECT_FINAL_DENIED", hint: dnsFail.hint }
        : dnsFail;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: MockFetchResponse;
    try {
      response = await fetchFn(currentUrl, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === "AbortError";
      if (aborted) {
        return { ok: false, code: "SSRF_FETCH_TIMEOUT", hint: `Fetch timed out after ${timeoutMs}ms` };
      }
      return { ok: false, code: "SSRF_DNS_FAILED", hint: String(err) };
    } finally {
      clearTimeout(timer);
    }

    if (response.redirectUrl && followRedirects) {
      redirectCount += 1;
      if (redirectCount > maxRedirects) {
        return { ok: false, code: "SSRF_REDIRECT_LIMIT", hint: `Exceeded ${maxRedirects} redirects` };
      }
      currentUrl = response.redirectUrl;
      continue;
    }

    if (response.body.byteLength > maxResponseBytes) {
      return { ok: false, code: "SSRF_RESPONSE_TOO_LARGE", hint: `Response ${response.body.byteLength} bytes exceeds ${maxResponseBytes}` };
    }

    return { ok: true, finalUrl: currentUrl, body: response.body };
  }
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    signal?: AbortSignal;
    headers?: Record<string, string>;
    redirect?: "follow" | "manual" | "error";
  },
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";

interface DohAnswer {
  type?: number;
  data?: string;
}

interface DohResponse {
  Answer?: DohAnswer[];
}

/** Resolve public A/AAAA records via DNS-over-HTTPS (RN-safe, no Node dns). */
export async function resolvePublicDnsViaDoh(
  host: string,
  fetchFn: FetchLike = globalThis.fetch.bind(globalThis),
): Promise<string[]> {
  const addresses: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    const query = `${DOH_ENDPOINT}?name=${encodeURIComponent(host)}&type=${type}`;
    const response = await fetchFn(query, {
      headers: { Accept: "application/dns-json" },
      redirect: "follow",
    });
    if (!response.ok) {
      continue;
    }
    const payload = (await response.json()) as DohResponse;
    for (const answer of payload.Answer ?? []) {
      if (answer.data) {
        addresses.push(answer.data);
      }
    }
  }
  if (addresses.length === 0) {
    throw new Error(`No public DNS records for ${host}`);
  }
  return addresses;
}

async function adaptFetchResponse(
  url: string,
  init: { signal?: AbortSignal } | undefined,
  fetchFn: FetchLike,
): Promise<MockFetchResponse> {
  const response = await fetchFn(url, {
    method: "GET",
    redirect: "manual",
    signal: init?.signal,
    headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (location) {
      return {
        status: response.status,
        body: new Uint8Array(),
        redirectUrl: new URL(location, url).href,
      };
    }
  }

  const buffer = await response.arrayBuffer();
  return { status: response.status, body: new Uint8Array(buffer) };
}

export interface LiveUrlFetchGuardOptions {
  fetchFn?: FetchLike;
  resolveDns?: UrlFetchGuardDeps["resolveDns"];
}

/** Production/live deps: real fetch + DoH DNS, both injectable for tests. */
export function createLiveUrlFetchGuardDeps(
  options: LiveUrlFetchGuardOptions = {},
): UrlFetchGuardDeps {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  return {
    resolveDns:
      options.resolveDns ??
      ((host) => resolvePublicDnsViaDoh(host, fetchFn)),
    fetch: (url, init) => adaptFetchResponse(url, init, fetchFn),
  };
}
