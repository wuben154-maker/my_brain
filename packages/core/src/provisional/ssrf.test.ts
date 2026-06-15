import { describe, expect, it } from "vitest";

import { validateUrlAllowlist } from "./urlFetchGuard.js";

/** M4 §2.1 fixture table — deterministic allowlist checks (no network). */
describe("SSRF allowlist fixtures", () => {
  it("ssrf-http-scheme → SSRF_SCHEME_DENIED", () => {
    const r = validateUrlAllowlist("http://example.com/a");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("SSRF_SCHEME_DENIED");
    }
  });

  it("ssrf-port-80 → SSRF_PORT_DENIED", () => {
    const r = validateUrlAllowlist("https://example.com:80/a");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("SSRF_PORT_DENIED");
    }
  });

  it("ssrf-ipv4-literal → SSRF_HOST_DENIED", () => {
    const r = validateUrlAllowlist("https://203.0.113.1/a");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("SSRF_HOST_DENIED");
    }
  });

  it("ssrf-localhost → SSRF_HOST_DENIED", () => {
    const r = validateUrlAllowlist("https://localhost/a");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("SSRF_HOST_DENIED");
    }
  });

  it("rejects IPv6 literal host", () => {
    const r = validateUrlAllowlist("https://[2001:db8::1]/a");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("SSRF_HOST_DENIED");
    }
  });

  it("rejects .local hostnames", () => {
    const r = validateUrlAllowlist("https://printer.local/doc");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("SSRF_HOST_DENIED");
    }
  });
});
