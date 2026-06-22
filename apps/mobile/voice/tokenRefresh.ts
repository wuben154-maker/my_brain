import type { TokenExchangeClient, TokenExchangeResult } from "./tokenExchangeClient";

const DEFAULT_REFRESH_SKEW_MS = 60_000;

export function msUntilTokenRefresh(expiresAt: string, nowMs = Date.now()): number {
  return new Date(expiresAt).getTime() - nowMs - DEFAULT_REFRESH_SKEW_MS;
}

export function shouldRefreshToken(
  record: { expiresAt: string } | null,
  nowMs = Date.now(),
): boolean {
  if (!record) {
    return true;
  }
  return msUntilTokenRefresh(record.expiresAt, nowMs) <= 0;
}

export interface TokenRefreshScheduler {
  schedule(expiresAt: string, refresh: () => Promise<void>): void;
  clear(): void;
}

export function createTokenRefreshScheduler(): TokenRefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule(expiresAt, refresh) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const delay = Math.max(0, msUntilTokenRefresh(expiresAt));
      timer = setTimeout(() => {
        timer = null;
        void refresh();
      }, delay);
    },
    clear() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export async function refreshVoiceToken(
  deviceId: string,
  tokenClient: TokenExchangeClient,
): Promise<TokenExchangeResult> {
  return tokenClient.exchange(deviceId);
}
