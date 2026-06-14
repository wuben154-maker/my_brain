#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/ios"
BUILD_DIR="$ROOT/build"
ARCHIVE_PATH="$BUILD_DIR/mybrain.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
EXPORT_PLIST="$BUILD_DIR/ExportOptions.plist"

mkdir -p "$BUILD_DIR" "$EXPORT_DIR"

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
echo "Using workspace=$WORKSPACE scheme=$SCHEME (preferred=$PREFERRED_SCHEME)"

cat > "$EXPORT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>teamID</key>
  <string>${IOS_TEAM_ID}</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>${IOS_BUNDLE_ID}</key>
    <string>${IOS_PROFILE_UUID}</string>
  </dict>
</dict>
</plist>
EOF

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM="$IOS_TEAM_ID" \
  CODE_SIGN_IDENTITY="Apple Development" \
  PROVISIONING_PROFILE_SPECIFIER="$IOS_PROFILE_UUID"

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST"

ls -la "$EXPORT_DIR"
