## iOS 自用真机包（GitHub Actions）

无 Mac / 无付费 Developer 时，用 **GitHub Actions 云端 Mac** + AppUploader 生成的 **Development 证书** 打出 `.ipa`。

### 前置

- GitHub Secrets（已配置）：`IOS_P12_BASE64`、`IOS_MOBILEPROVISION_BASE64`、`IOS_P12_PASSWORD`
- `app.json` → `ios.bundleIdentifier` 与 mobileprovision 一致（当前：`app.mybrain.personal`）
- iPhone **UDID 已写入** mobileprovision

### 触发打包

1. GitHub → **Actions** → **iOS Dev IPA** → **Run workflow**
2. 完成后在 **Artifacts** 下载 `mybrain-ios-dev-ipa`
3. 用 **Sideloadly**（或 Xcode Devices）装到 iPhone

### M2 设备证据

App → 迁移完成 → **··· → 设置 → 生成 iOS 备份排除证据** → JSON 保存到  
`specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json`
