#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/ios"
BUILD_DIR="$ROOT/build/simulator"
APP_ZIP="$BUILD_DIR/my-brain-ios-simulator-app.zip"

mkdir -p "$BUILD_DIR"

WORKSPACE="$(find "$IOS_DIR" -maxdepth 1 -name '*.xcworkspace' | head -n1)"
if [[ -z "$WORKSPACE" ]]; then
  echo "No .xcworkspace under $IOS_DIR"
  exit 1
fi

PREFERRED_SCHEME="$(node -p "require('$ROOT/app.json').expo.scheme")"
SCHEME="$(xcodebuild -list -json -workspace "$WORKSPACE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
schemes = data.get('workspace', {}).get('schemes', [])
preferred = sys.argv[1] if len(sys.argv) > 1 else ''
if preferred in schemes:
    print(preferred)
    sys.exit(0)
pod_like = {'boost', 'RCT-Folly', 'DoubleConversion', 'fmt', 'glog', 'hermes-engine'}
app_schemes = [s for s in schemes if 'Pods' not in s and s not in pod_like]
print(app_schemes[0] if app_schemes else '')
" "$PREFERRED_SCHEME")"

if [[ -z "$SCHEME" ]]; then
  echo "No app scheme found in workspace (preferred=$PREFERRED_SCHEME)"
  exit 1
fi

echo "Using workspace=$WORKSPACE scheme=$SCHEME"

DERIVED="$BUILD_DIR/DerivedData"
rm -rf "$DERIVED"

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphonesimulator \
  -derivedDataPath "$DERIVED" \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGNING_ALLOWED=NO \
  build

APP_PATH="$(find "$DERIVED/Build/Products" -maxdepth 2 -name '*.app' -type d | head -n1)"
if [[ -z "$APP_PATH" ]]; then
  echo "No .app found under $DERIVED/Build/Products"
  exit 1
fi

echo "Built app: $APP_PATH"
rm -f "$APP_ZIP"
(
  cd "$(dirname "$APP_PATH")"
  zip -r "$APP_ZIP" "$(basename "$APP_PATH")"
)

echo "Appetize artifact: $APP_ZIP"
