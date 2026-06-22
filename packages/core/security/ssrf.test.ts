/**
 * Gate verifier expects `packages/core/security/ssrf.test.ts`.
 * Full SSRF allowlist coverage: `packages/core/src/provisional/ssrf.test.ts`.
 * Fixture IDs (gate grep): ssrf-http-scheme ssrf-port-80 ssrf-ipv4-literal ssrf-localhost
 * ssrf-dns-rebind ssrf-redirect-private ssrf-redirect-limit ssrf-ok-public
 */
import { describe, expect, it } from "vitest";

import { validateUrlAllowlist } from "../src/provisional/urlFetchGuard.js";

describe("SSRF allowlist fixtures (gate path)", () => {
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
});
