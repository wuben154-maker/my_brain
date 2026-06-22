# iOS Share Extension scaffold (M4 Batch B)

> **Status:** scaffold only · **NOT** M4-GATE device PASS · requires Mac + Xcode prebuild

## Config linkage status (2026-06-16)

| Item | Status |
|------|--------|
| Swift scaffold (`ShareViewController.swift`, `Info.plist`) | ✅ in repo |
| App Group entitlements example | ✅ `ShareExtension.entitlements.example.plist` |
| Expo config plugin / `app.json` plugin entry | ❌ **not linked** — Extension target not added by prebuild |
| Xcode Share Extension target | ❌ **manual** after `expo prebuild` on Mac |
| Native module: main app reads App Group on launch | ❌ **PENDING_DEVICE** — JS path uses `iosAppGroupShare.ts` mock + persisted handoff queue |
| M4-GATE device PASS | ❌ **PENDING_DEVICE** — do not claim PASS without iPhone evidence |

## Purpose

Share Extension receives Safari/Notes/Photos shares, writes **structured JSON only** to App Group, then opens main app. Main app consumes via `parseIosAppGroupSharePayload` → `intakeSharePayload` → provisional queue.

## App Group

| Key | Value |
|-----|-------|
| App Group ID | `group.app.mybrain.shared` |
| Pending payload key | `pendingSharePayload` (UserDefaults / shared file) |

## Payload schema

Must match `packages/core/src/provisional/sharePayload.ts`:

- `platform`: `"ios"` (required)
- `payloadKind`: `"url"` \| `"text"` \| `"image"`
- `url`: https only when kind is url
- `title`, `mime`, `sourceApp`, `capturedAt`: optional structured fields
- **Forbidden:** `apiKey`, `token`, `secret`, `password`, `authorization`, `bearer`

## Native targets (when building on Mac)

1. Add Share Extension target in Xcode after `expo prebuild`
2. Enable App Groups capability on **both** main app and extension
3. Extension `ShareViewController` writes JSON to App Group — see `ShareExtension/ShareViewController.swift`
4. Main app reads on launch via native module (future) or Expo config plugin

## Security checklist

- [ ] Extension Info.plist contains no API keys
- [ ] App Group container stores payload JSON only (no full article body)
- [ ] Extension does not call outbound fetch — UrlFetchGuard runs in main app only
- [ ] Voice note share remains disabled until M3-GATE PASS (`M3_VOICE_SHARE_DISABLED`)

## Device evidence (PENDING_DEVICE)

Record on real iPhone: model, iOS version, Safari share → Extension → provisional queue visible, kill app → candidate persists.
