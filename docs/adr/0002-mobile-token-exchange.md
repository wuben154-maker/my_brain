# ADR 0002 — Mobile Token Exchange

- **Status:** accepted (M3 mock-first)
- **Date:** 2026-06-14
- **Context:** M3 requires OpenAI/Volc Realtime voice without embedding long-lived provider keys in APK/IPA or git.

## Decision

1. **Long-lived keys never ship in the app bundle.** Provider credentials live only on a token exchange service (BFF or Volc STS) reachable over HTTPS.
2. **Mobile obtains short-lived access tokens** via `TokenExchangeClient.exchange({ deviceId })` → `{ accessToken, expiresAt }`.
3. **Short-lived tokens persist only in `expo-secure-store`** via `SecureTokenStore` adapter (`apps/mobile/voice/secureTokenStore.ts`). Memory-only mock adapter is used in Vitest.
4. **M3 default:** `createMockTokenExchangeClient()` returns a synthetic token with 15-minute TTL. Staging endpoint URL is read from shell-injected `readAppEnv().tokenExchangeUrl` (non-secret); no key in env.
5. **Failure path:** `TokenExchangeError` → `voice_disconnected` degraded mode + text three-intent path remains available. Graph/profile layers are not written.

## Consequences

- Dev Client builds can demo voice loop without real exchange service.
- Production requires deploying exchange BFF before claiming live voice.
- Token refresh is client-initiated before `expiresAt`; failed refresh reuses §6.1 degraded evidence.

## Out of scope (M3)

- OAuth user login, multi-tenant billing, server implementation of exchange (document contract only).
