import { describe, expect, it } from "vitest";

import {
  createLiveUrlFetchGuardDeps,
  guardedUrlFetch,
} from "../src/provisional/urlFetchGuard.js";

describe("createLiveUrlFetchGuardDeps", () => {
  it("ssrf-ok-public → ok with injectable fetch body", async () => {
    const body = new TextEncoder().encode("<html>live ok</html>");
    const deps = createLiveUrlFetchGuardDeps({
      resolveDns: async () => ["93.184.216.34"],
      fetchFn: async () => ({
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => body.buffer,
      }),
    });

    const result = await guardedUrlFetch("https://example.com/article", {}, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://example.com/article");
      expect(result.body).toEqual(body);
    }
  });

  it("follows redirect Location via live fetch adapter", async () => {
    const deps = createLiveUrlFetchGuardDeps({
      resolveDns: async () => ["93.184.216.34"],
      fetchFn: async (url) => {
        if (url.endsWith("/start")) {
          return {
            status: 302,
            headers: {
              get: (name: string) =>
                name.toLowerCase() === "location" ? "https://example.com/final" : null,
            },
            arrayBuffer: async () => new ArrayBuffer(0),
          };
        }
        const body = new TextEncoder().encode("done");
        return {
          status: 200,
          headers: { get: () => null },
          arrayBuffer: async () => body.buffer,
        };
      },
    });

    const result = await guardedUrlFetch("https://example.com/start", {}, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://example.com/final");
    }
  });

  it("SSRF_FETCH_TIMEOUT propagates through live adapter", async () => {
    const deps = createLiveUrlFetchGuardDeps({
      resolveDns: async () => ["93.184.216.34"],
      fetchFn: async (_url, init) => {
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
        return {
          status: 200,
          headers: { get: () => null },
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      },
    });

    const result = await guardedUrlFetch("https://slow.test/page", { timeoutMs: 50 }, deps);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SSRF_FETCH_TIMEOUT");
    }
  });
});
