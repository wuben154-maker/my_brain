# my_brain Mobile — Dev Client Build Path (S13)

> **Expo Go is NOT an acceptance path** for M3+ voice, native permissions, or share intake. Use **Expo Dev Client** or EAS preview builds only.

## Prerequisites

- Node 20+, pnpm (repo root)
- Android: Android Studio + SDK 34 emulator or USB device
- iOS: macOS + Xcode 15+ (Windows/Linux can prebuild Android only; iOS uses config + mock smoke until Mac CI/device)

## Local Dev Client (recommended)

From repo root:

```bash
pnpm install
cd apps/mobile
npx expo prebuild --no-install
npx expo run:android
# macOS only:
npx expo run:ios
```

Start Metro for an installed Dev Client:

```bash
cd apps/mobile
npx expo start --dev-client
```

## EAS optional profiles

`apps/mobile/eas.json` defines:

| Profile | Purpose |
|---------|---------|
| `development` | Dev Client, internal distribution |
| `preview` | Internal preview APK/IPA (no store submit) |

```bash
cd apps/mobile
eas build --profile development --platform android
eas build --profile preview --platform all
```

EAS account/credentials are **optional for S13 PASS**. If blocked, report `EAS_OPTIONAL_BLOCKED` and continue with local prebuild + mock device evidence.

## Smoke matrix (S13)

Runtime smoke path IDs (each requires Android **and** iOS evidence — mock or real):

- `runtime-cold-start`
- `runtime-nav-shell`
- `runtime-expo-config`
- `runtime-permission-declared`
- `runtime-intent-filter`
- `runtime-degraded-visible`

Generate mock artifacts (no USB):

```bash
npx tsx tools/app-ui-execution/device-smoke-matrix.ts --write-mock
```

Replace mocks with real device recordings when USB/simulator smoke is available.

## Share Extension (iOS)

Scaffold lives at `apps/mobile/native/ios-share-extension/`. After `expo prebuild` on Mac, manually add the Share Extension target in Xcode; App Group ID: `group.app.mybrain.shared`. See scaffold README for security checklist.

## Verify config without installing

```bash
pnpm --filter @my-brain/mobile exec expo:config
pnpm -w exec vitest run apps/mobile/appConfig.test.ts apps/mobile/runtimeSmoke.test.ts apps/mobile/androidIntentFilters.test.ts
```
