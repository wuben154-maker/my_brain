import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_MAX_RESPONSE_BYTES,
  guardedUrlFetch,
  type MockFetchResponse,
  type UrlFetchGuardDeps,
} from "./urlFetchGuard.js";

const publicDns: UrlFetchGuardDeps["resolveDns"] = async () => ["93.184.216.34"];

function mockFetch(
  handler: (url: string) => MockFetchResponse,
): UrlFetchGuardDeps["fetch"] {
  return async (url) => handler(url);
}

describe("UrlFetchGuard guardedUrlFetch", () => {
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

  it("SSRF_FETCH_TIMEOUT on slow mock fetch", async () => {
    const result = await guardedUrlFetch(
      "https://slow.test/page",
      { timeoutMs: 50 },
      {
        resolveDns: publicDns,
        fetch: async (_url, init) => {
          await new Promise<void>((resolve, reject) => {
            const signal = init?.signal;
            if (signal?.aborted) {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
              return;
            }
            signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            });
            setTimeout(resolve, 200);
          });
          return { status: 200, body: new Uint8Array() };
        },
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_FETCH_TIMEOUT");
    }
  });

  it("SSRF_RESPONSE_TOO_LARGE rejects oversized body", async () => {
    const huge = new Uint8Array(DEFAULT_MAX_RESPONSE_BYTES + 1);
    const result = await guardedUrlFetch(
      "https://big.test/",
      {},
      {
        resolveDns: publicDns,
        fetch: mockFetch(() => ({ status: 200, body: huge })),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_RESPONSE_TOO_LARGE");
    }
  });

  it("SSRF_DNS_FAILED when resolver throws", async () => {
    const result = await guardedUrlFetch(
      "https://nxdomain.test/",
      {},
      {
        resolveDns: async () => {
          throw new Error("ENOTFOUND");
        },
        fetch: mockFetch(() => ({ status: 200, body: new Uint8Array() })),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_DNS_FAILED");
    }
  });

  it("revalidates each redirect hop against allowlist", async () => {
    const result = await guardedUrlFetch(
      "https://example.com/start",
      {},
      {
        resolveDns: publicDns,
        fetch: mockFetch((url) => {
          if (url.endsWith("/start")) {
            return {
              status: 302,
              body: new Uint8Array(),
              redirectUrl: "https://localhost/final",
            };
          }
          return { status: 200, body: new Uint8Array() };
        }),
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_REDIRECT_FINAL_DENIED");
    }
  });
});
