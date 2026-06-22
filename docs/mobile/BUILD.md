# Mobile build guide (Android + iOS)

This repo ships **my_brain** as an Expo / React Native app in `apps/mobile`, with shared logic in `packages/core`.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ (see root `packageManager`) |
| Android | JDK 17, Android SDK, USB debugging for device installs |
| iOS (local) | macOS + Xcode + Apple Developer account |
| iOS (no Mac) | Expo account + EAS CLI (cloud build) |

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
```

## API keys (required for full voice + LLM)

Keys are **never baked into release builds**. Each user configures them inside the app:

**Settings → Provider settings** (or cold-start provider gate on first launch).

For **development only**, copy `.env.example` → `.env.local` at the repo root. Metro / dev-client reads companion keys via `apps/mobile/app.config.js` and seeds secure storage on device. Release APK/IPA does **not** read `.env.local`.

| Variable | Purpose |
|----------|---------|
| `DOUBAO_VOICE_APP_ID` | Volcengine / 豆包 realtime voice App ID |
| `DOUBAO_VOICE_ACCESS_TOKEN` | Volcengine access token (WS handshake) |
| `DOUBAO_VOICE_SECRET_KEY` | Volcengine secret (local reference only) |
| `MODELSCOPE_LLM_API_KEY` | ModelScope OpenAI-compatible LLM |
| `MODELSCOPE_LLM_BASE_URL` | Default: `https://api-inference.modelscope.cn/v1` |
| `MODELSCOPE_LLM_MODEL` | e.g. `Qwen/Qwen2.5-7B-Instruct` |

Obtain keys from [Volcengine console](https://www.volcengine.com/docs/6561/1594356) and [ModelScope](https://modelscope.cn).

## Android — release APK (recommended for sharing)

Uses the committed `apps/mobile/android/` native project (no Metro required on end users' phones).

```bash
cd my_brain
pnpm install

# From repo root (Git Bash / WSL / macOS / Linux):
bash apps/mobile/scripts/build-android-release-apk.sh
```

Output:

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

Install on a device:

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

**Note:** Install the **release** APK for normal app UX. Debug / dev-client builds open the Expo development launcher when reopened.

### Android — dev loop (USB + Metro)

```powershell
# Windows PowerShell — unset CI so Metro serves a dev bundle
Remove-Item Env:CI -ErrorAction SilentlyContinue
pnpm --filter @my-brain/mobile exec expo start --dev-client --port 8081
adb reverse tcp:8081 tcp:8081
pnpm --filter @my-brain/mobile android
```

## iOS — option A: Mac + Xcode (fastest dev loop)

```bash
cd my_brain
pnpm install
pnpm --filter @my-brain/mobile exec expo prebuild --platform ios
pnpm --filter @my-brain/mobile ios
```

Open `apps/mobile/ios/*.xcworkspace` in Xcode to run on a simulator or a signed device.

Share Extension scaffold lives in `apps/mobile/native/ios-share-extension/` (manual Xcode target wiring after prebuild).

## iOS — option B: EAS cloud build (no Mac)

From repo root:

```bash
npm i -g eas-cli   # or: pnpm dlx eas-cli
eas login
cd apps/mobile
eas build --platform ios --profile preview
```

Profiles are defined in `apps/mobile/eas.json` (`development`, `preview`, `appetize`).

- **preview / development**: device `.ipa` (requires Apple Developer signing in EAS)
- **appetize**: simulator build for remote demo

Download the artifact from [expo.dev](https://expo.dev) and install via Xcode Devices, TestFlight, or Sideloadly (see `specs/mobile-app/runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md`).

GitHub Actions workflow for dev IPA: `apps/mobile/docs/IOS_GHA_BUILD.md`.

## Verify before publishing

```bash
pnpm scan:secrets
pnpm --filter @my-brain/mobile test
pnpm --filter @my-brain/core test
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App opens Expo dev menu | Install **release** APK, not debug dev-client |
| Voice silent after release install | Re-enter API keys in Provider settings (no dev env seed) |
| `local.properties` missing | Create `apps/mobile/android/local.properties` with `sdk.dir=...` or run Android Studio once |
| iOS build fails on Windows | Use EAS cloud build (Option B) |

More product context: root [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md), [`apps/mobile/README.md`](../../apps/mobile/README.md).
