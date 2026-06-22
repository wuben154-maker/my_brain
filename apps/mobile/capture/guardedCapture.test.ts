/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from "vitest";

import { captureShareLink, InMemoryGraphRepository } from "@my-brain/core";
import {
  getMobileUrlGuard,
  MOBILE_LIVE_URL_GUARD,
  MOBILE_MOCK_URL_GUARD,
  setMobileUrlGuardForTests,
  setMobileUrlGuardUseMockForTests,
} from "./guardedCapture";

describe("guardedCapture mobile URL guard", () => {
  afterEach(() => {
    setMobileUrlGuardForTests(null);
    setMobileUrlGuardUseMockForTests(false);
  });

  it("exposes live guard with injectable fetch + DNS", () => {
    expect(MOBILE_LIVE_URL_GUARD.resolveDns).toBeTypeOf("function");
    expect(MOBILE_LIVE_URL_GUARD.fetch).toBeTypeOf("function");
  });

  it("uses mock guard when test override requests mock mode", () => {
    setMobileUrlGuardUseMockForTests(true);
    expect(getMobileUrlGuard()).toBe(MOBILE_MOCK_URL_GUARD);
  });

  it("live guard success path creates provisional candidate only", async () => {
    const graph = new InMemoryGraphRepository();
    setMobileUrlGuardForTests({
      resolveDns: async () => ["93.184.216.34"],
      fetch: async () => ({ status: 200, body: new TextEncoder().encode("article") }),
    });

    const { candidate, fetchResult } = await captureShareLink(
      { summary: "文章", linkUrl: "https://example.com/article" },
      { graph, urlGuard: getMobileUrlGuard() },
    );

    expect(fetchResult.ok).toBe(true);
    expect(candidate.fetchOk).toBe(true);
    expect(candidate.status).toBe("pending");
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("rejects private-network style URLs via SSRF guard", async () => {
    const graph = new InMemoryGraphRepository();
    setMobileUrlGuardForTests({
      resolveDns: async () => ["10.0.0.1"],
      fetch: async () => ({ status: 200, body: new Uint8Array() }),
    });

    const { candidate, fetchResult } = await captureShareLink(
      { summary: "rebind", linkUrl: "https://rebind.test/evil" },
      { graph, urlGuard: getMobileUrlGuard() },
    );

    expect(fetchResult.ok).toBe(false);
    if (!fetchResult.ok) {
      expect(fetchResult.code).toBe("SSRF_DNS_PRIVATE");
    }
    expect(candidate.ssrfRejectCode).toBe("SSRF_DNS_PRIVATE");
    expect(graph.countVisibleNodes()).toBe(0);
  });
});
