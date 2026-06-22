/**
 * Mobile URL capture guard — live fetch + SSRF allowlist in production;
 * tests inject deterministic deps via setMobileUrlGuardForTests.
 */
import type { UrlFetchGuardDeps } from "@my-brain/core";
import { createLiveUrlFetchGuardDeps } from "@my-brain/core";

/** Deterministic mock for unit tests and offline dev fixture buttons. */
export const MOBILE_MOCK_URL_GUARD: UrlFetchGuardDeps = {
  resolveDns: async (host) => {
    if (host === "rebind.test" || host === "evil-dns.test") {
      return ["10.0.0.1"];
    }
    return ["93.184.216.34"];
  },
  fetch: async (url) => {
    if (url.includes("slow.test")) {
      await new Promise((r) => setTimeout(r, 10_000));
    }
    return { status: 200, body: new TextEncoder().encode("<mock/>") };
  },
};

export const MOBILE_LIVE_URL_GUARD: UrlFetchGuardDeps = createLiveUrlFetchGuardDeps();

let urlGuardOverride: UrlFetchGuardDeps | null = null;
let useMockGuard = false;

export function setMobileUrlGuardForTests(deps: UrlFetchGuardDeps | null): void {
  urlGuardOverride = deps;
}

/** Force mock guard for deterministic tests (default when override is null). */
export function setMobileUrlGuardUseMockForTests(useMock: boolean): void {
  useMockGuard = useMock;
}

export function getMobileUrlGuard(): UrlFetchGuardDeps {
  if (urlGuardOverride) {
    return urlGuardOverride;
  }
  if (useMockGuard || (typeof process !== "undefined" && process.env.VITEST === "true")) {
    return MOBILE_MOCK_URL_GUARD;
  }
  return MOBILE_LIVE_URL_GUARD;
}
