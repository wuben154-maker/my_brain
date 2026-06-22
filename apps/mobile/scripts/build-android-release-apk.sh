#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT/android"

export NODE_ENV="${NODE_ENV:-production}"

cd "$ANDROID_DIR"
chmod +x ./gradlew
./gradlew assembleRelease \
  -x lintVitalRelease \
  -x lintVitalAnalyzeRelease \
  --no-daemon

APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK" ]]; then
  echo "APK not found at $APK"
  exit 1
fi

echo "Android release APK: $APK"
