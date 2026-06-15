import { TokenExchangeError } from "@my-brain/core";

export interface TokenExchangeResult {
  accessToken: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface TokenExchangeClient {
  exchange(deviceId: string): Promise<TokenExchangeResult>;
}

export interface TokenExchangeClientOptions {
  mode: "mock" | "staging";
  stagingUrl?: string;
}

/** Mock exchange — synthetic token, no network, no long-lived key. */
export function createMockTokenExchangeClient(): TokenExchangeClient {
  return {
    async exchange(deviceId: string) {
      if (!deviceId.trim()) {
        throw new TokenExchangeError("deviceId required for token exchange");
      }
      const ttlSeconds = 900;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      return {
        accessToken: `mock-voice-${deviceId.slice(0, 8)}`,
        expiresAt,
        ttlSeconds,
      };
    },
  };
}

/** Staging-friendly client — fails closed when URL missing; never embeds provider secret. */
export function createStagingTokenExchangeClient(
  stagingUrl: string | undefined,
): TokenExchangeClient {
  return {
    async exchange(deviceId: string) {
      if (!stagingUrl) {
        throw new TokenExchangeError("token exchange staging URL not configured");
      }
      const res = await fetch(stagingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) {
        throw new TokenExchangeError(`token exchange failed: HTTP ${res.status}`);
      }
      const body = (await res.json()) as Partial<TokenExchangeResult>;
      if (!body.accessToken || !body.expiresAt) {
        throw new TokenExchangeError("token exchange response missing fields");
      }
      return {
        accessToken: body.accessToken,
        expiresAt: body.expiresAt,
        ttlSeconds: body.ttlSeconds ?? 900,
      };
    },
  };
}

export function createTokenExchangeClient(
  options: TokenExchangeClientOptions,
): TokenExchangeClient {
  if (options.mode === "staging") {
    return createStagingTokenExchangeClient(options.stagingUrl);
  }
  return createMockTokenExchangeClient();
}
