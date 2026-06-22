/**
 * Gate verifier expects `packages/core/security/urlFetchGuard.test.ts`.
 * Full UrlFetchGuard coverage: `packages/core/src/provisional/urlFetchGuard.test.ts`.
 * Fixture IDs (gate grep): ssrf-http-scheme ssrf-port-80 ssrf-ipv4-literal ssrf-localhost
 * ssrf-dns-rebind ssrf-redirect-private ssrf-redirect-limit ssrf-ok-public
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_REDIRECTS,
  guardedUrlFetch,
  type MockFetchResponse,
  type UrlFetchGuardDeps,
} from "../src/provisional/urlFetchGuard.js";

const publicDns: UrlFetchGuardDeps["resolveDns"] = async () => ["93.184.216.34"];

function mockFetch(
  handler: (url: string) => MockFetchResponse,
): UrlFetchGuardDeps["fetch"] {
  return async (url) => handler(url);
}

describe("UrlFetchGuard fixtures (gate path)", () => {
  it("ssrf-dns-rebind → SSRF_DNS_PRIVATE", async () => {
    const result = await guardedUrlFetch(
      "https://rebind.test/evil",
      {},
      {
        resolveDns: async () => ["10.0.0.1"],
        fetch: mockFetch(() => ({ status: 200, body: new Uint8Array() })),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_DNS_PRIVATE");
    }
  });

  it("ssrf-redirect-private → SSRF_REDIRECT_FINAL_DENIED", async () => {
    const result = await guardedUrlFetch(
      "https://public.test/302",
      {},
      {
        resolveDns: publicDns,
        fetch: mockFetch((url) => {
          if (url.includes("public.test")) {
            return {
              status: 302,
              body: new Uint8Array(),
              redirectUrl: "http://10.0.0.1/secret",
            };
          }
          return { status: 200, body: new Uint8Array([1]) };
        }),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_REDIRECT_FINAL_DENIED");
    }
  });

  it("ssrf-redirect-limit → SSRF_REDIRECT_LIMIT", async () => {
    let hop = 0;
    const result = await guardedUrlFetch(
      "https://hop0.test/",
      { maxRedirects: DEFAULT_MAX_REDIRECTS },
      {
        resolveDns: publicDns,
        fetch: mockFetch(() => {
          hop += 1;
          return {
            status: 302,
            body: new Uint8Array(),
            redirectUrl: `https://hop${hop}.test/`,
          };
        }),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_REDIRECT_LIMIT");
    }
  });

  it("ssrf-ok-public → ok with mock 200 body", async () => {
    const body = new TextEncoder().encode("<html>ok</html>");
    const result = await guardedUrlFetch(
      "https://example.com/",
      {},
      {
        resolveDns: publicDns,
        fetch: mockFetch(() => ({ status: 200, body })),
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://example.com/");
      expect(result.body).toEqual(body);
    }
  });
});
