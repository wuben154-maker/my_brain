# ADR 0001: React Native + Expo over Flutter

- **Status**: accepted
- **Date**: 2026-06-13
- **Context**: M0 app-only foundation needs a mobile shell that reuses existing TypeScript/React domain logic and provider abstractions.

## Decision

Adopt **Expo + React Native** for `apps/mobile`, with shared business logic in `packages/core`.

## Rationale

- The repository is already TypeScript/React with Zustand and swappable providers.
- `packages/core` can stay UI-free; mobile adds RN adapters in M1+.
- Expo Dev Client supports the staged rollout (Expo Go for M0–M1 skeleton; native modules from M2/M3).
- Flutter would break TS reuse and duplicate provider/domain work.

## Consequences

- Mobile UI uses Reanimated/Skia (M1+) instead of `react-force-graph`.
- Voice, SQLite, and Share Extension require Dev Client / native builds from M2–M4.
- Legacy Web/Tauri (`src/`) remains a dev surface; **mobile is the product entry**.

## Alternatives considered

- **Flutter**: higher animation ceiling, but Dart ecosystem fork and no core reuse.
- **Capacitor WebView**: weaker native voice/Share Extension story for this product.

## References

- [`docs/MOBILE_PRODUCT_PLAN.md`](../MOBILE_PRODUCT_PLAN.md) §2, §4
- [`specs/mobile-app/M0-app-only-foundation.md`](../specs/mobile-app/M0-app-only-foundation.md)
