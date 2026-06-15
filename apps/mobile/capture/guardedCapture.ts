/**
 * M4 mock URL guard deps — deterministic, no real network.
 * Production native share/OCR paths must use the same core UrlFetchGuard.
 */
import type { MockFetchResponse, UrlFetchGuardDeps } from "@my-brain/core";

export const MOBILE_MOCK_URL_GUARD: UrlFetchGuardDeps = {
  resolveDns: async (host) => {
    if (host === "rebind.test" || host === "evil-dns.test") {
      return ["10.0.0.1"];
    }
    return ["93.184.216.34"];
  },
  fetch: async (url): Promise<MockFetchResponse> => {
    if (url.includes("slow.test")) {
      await new Promise((r) => setTimeout(r, 10_000));
    }
    return { status: 200, body: new TextEncoder().encode("<mock/>") };
  },
};

/** Injectable override for tests. */
let urlGuardOverride: UrlFetchGuardDeps | null = null;

export function setMobileUrlGuardForTests(deps: UrlFetchGuardDeps | null): void {
  urlGuardOverride = deps;
}

export function getMobileUrlGuard(): UrlFetchGuardDeps {
  return urlGuardOverride ?? MOBILE_MOCK_URL_GUARD;
}
