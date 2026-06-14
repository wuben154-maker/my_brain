# Windows 无 Mac 移动交付 Runbook

> **状态**：草案（交付控制面文档，非业务代码）  
> **更新时间**：2026-06-13  
> **适用环境**：Windows 11 开发机 + 自用 iPhone（无 Mac）  
> **权威关联**：[`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) · [`specs/mobile-app/README.md`](../README.md) · [`EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) · [`M6-release-observability-and-mobile-e2e.md`](../M6-release-observability-and-mobile-e2e.md)

---

## 1. 目标与非目标

### 1.1 目标

| 目标 | 说明 |
|------|------|
| **自用 iPhone 完整演示** | 在 Windows 11 上触发 EAS 云构建生成 `.ipa`，下载后用 **Sideloadly** 安装到**自己的** iPhone，完成 M0–M7 主体能力的真机验收与现场演示 |
| **Android APK 可分享** | 本地或 EAS 产出 **APK**，可发给他人安装体验（侧载 / 内部分发），不依赖 Google Play 上架 |
| **远程辅助演示** | 用 **Appetize.io** 上传 simulator / dev build 产物，提供远程观看链接或配合录屏；用于 UI/导航 smoke，**不替代**自用 iPhone 真机证据 |
| **与 Gate 对齐** | 明确哪些能力可在 M0/M1 mock；哪些在 M3/M4/M6 必须 **`NEEDS_DEVICE_EVIDENCE`** 或真机 PASS；Appetize **不替代** M6/M7 gate |

### 1.2 非目标

| 非目标 | 说明 |
|--------|------|
| **iOS 不上架** | 不推进 App Store 审核、不准备完整商店合规包作为当前阻塞项 |
| **iOS 不分发给别人** | 不向他人分发 `.ipa`、不登记他人 UDID、不把 TestFlight/Ad Hoc 作为当前主路径 |
| **不假装已解决 Apple 签名限制** | 免费 Apple ID + Sideloadly 的签名有效期、entitlements、Share Extension/App Group 等须**实测**并记录；文档只列风险与复验点 |
| **不替代 monorepo / M0 实施** | 本 Runbook 不落地 `apps/mobile` 代码、不修改 `package.json` 脚本 |
| **不把 Appetize 当 gate 唯一平台** | M6 双端 smoke、M3 barge-in、M4 Share Extension 真机证据**不能**仅用 Appetize 声称 PASS |

---

## 2. 环境准备清单

实施 M0+ 移动工程或执行本 Runbook 前，按下列清单准备。打勾项可在 `docs/evals/delivery-env-checklist.md`（可选）或 M6-GATE 报告中引用。

### 2.1 Windows 开发机（必需）

| 项 | 版本/要求 | 用途 |
|----|-----------|------|
| **操作系统** | Windows 11（64-bit） | 主开发环境 |
| **Node.js** | LTS（与仓库 `package.json` engines 对齐，实施时确认） | Expo / EAS / pnpm |
| **pnpm** | 与根目录 lockfile 一致 | monorepo 安装与脚本 |
| **Git** | 当前仓库可 clone / pull | 源码与 EAS 构建上下文 |
| **USB 数据线** | 支持数据传输的 Lightning/USB-C 线 | iPhone 信任电脑、Sideloadly 安装 |
| **稳定网络** | 可访问 `expo.dev`、`cdn.expo.dev` | EAS 云构建提交与产物下载 |

### 2.2 Expo / EAS（必需）

| 项 | 说明 |
|----|------|
| **Expo 账号** | 注册 [expo.dev](https://expo.dev)；项目 `slug` 与 `owner` 在 `app.json` / `eas.json` 中配置（M0+ 落地后） |
| **EAS CLI** | `npm i -g eas-cli` 或 `pnpm dlx eas-cli`；`eas login` |
| **EAS 项目** | `eas init` 绑定仓库（M0+ 有 `apps/mobile` 后执行） |
| **构建额度** | EAS Free 有每月 Android/iOS 构建次数限制；记录排队时间与额度消耗 |

### 2.3 iOS 自机安装（必需 — 无 Mac 路径）

| 项 | 说明 |
|----|------|
| **自用 iPhone** | iOS 版本须满足 Expo SDK 最低要求（实施时在 `app.json` 标注） |
| **iTunes（Windows）** | 安装 Apple 设备驱动与「信任此电脑」流程；[Apple 支持：在 Windows 上安装 iTunes](https://support.apple.com/zh-cn/IT1081) |
| **iPhone 信任电脑** | 连接数据线 → 手机点「信任」→ iTunes/Finder 等价流程在 Windows 上通过 iTunes 或 Sideloadly 识别设备 |
| **Sideloadly** | 从官方渠道安装；用于将 `.ipa` 侧载到本机 iPhone |
| **Apple ID** | 用于 Sideloadly 签名；**免费 Apple ID** 有 7 天签名有效期等限制（见 §4.5） |
| **Apple Developer Program** | **可选**；仅当 Sideloadly + 免费 ID 无法满足 entitlements（如长期有效的 Share Extension/App Group）时再评估 |

### 2.4 Appetize（远程演示辅助 — 推荐）

| 项 | 说明 |
|----|------|
| **Appetize 账号** | [appetize.io](https://appetize.io) 注册 |
| **API Token** | 控制台生成；用于 CLI/API 上传；**勿提交 git** |
| **上传格式** | 通常 `.zip`（含 `.app`）或平台文档要求的 simulator build；**非** Sideloadly 用的裸 `.ipa` 直接等价（见 §5） |

### 2.5 Android（APK 分享 — 必需其一）

| 项 | 说明 |
|----|------|
| **EAS Android build** | `profile` 产出 APK 或 AAB（分享用优先 **APK**） |
| **Android Studio + adb** | **可选**；本地 `expo run:android` / 模拟器 / USB 调试 |
| **Google Play Console** | **可选**；APK 直接分享不强制 |

### 2.6 安全与密钥（M3 前须规划）

| 项 | 说明 |
|----|------|
| **Token exchange BFF** | 长期 provider 密钥不进 APK/IPA；初期本地或 LAN BFF（见 §8） |
| **环境变量** | API key 仅 dev machine / CI secret / BFF；不进仓库 |
| **Sideloadly** | 使用独立 Apple ID 或应用专用密码策略；不在录屏中暴露密码 |

### 2.7 准备完成判定

- [ ] Windows 11 上 `node -v`、`pnpm -v` 可用  
- [ ] `eas whoami` 已登录  
- [ ] iPhone 连接 Windows 后设备可见且已信任  
- [ ] Sideloadly 可识别本机 iPhone（空载试连一次）  
- [ ] Appetize 账号可登录且 token 已生成（仅存本机密码管理器）  
- [ ] （Android）adb `devices` 可见或确认仅用 EAS 产出 APK  

---

## 3. Android APK 产出与分享流程

### 3.1 构建 profile 要点（EAS）

在 `apps/mobile/eas.json`（M0+ 创建）中建议至少：

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "apk" }
    }
  }
}
```

| Profile | 用途 | 分享 |
|---------|------|------|
| `development` | Dev Client；含原生模块调试 | 内部分发 APK |
| `preview` | 接近发布的内测包 | **推荐给试用者** |
| `production` | 正式发布形态 | 可分享 APK；商店用 AAB 为 optional |

### 3.2 Windows 上触发构建

```powershell
cd D:\my_brain\apps\mobile
eas build --platform android --profile preview
```

- 首次构建：EAS 会提示生成 Android keystore（云端托管或本地导出备份）。  
- 构建完成后：在 [expo.dev](https://expo.dev) 项目页下载 **APK** 或 `eas build:download`。

### 3.3 分享给他人

1. 将 APK 通过网盘 / 聊天工具发送（附带 §3.4 安装说明）。  
2. 接收方须在 Android 设置中允许「未知来源」或按机型允许该安装器。  
3. **不要**在 APK 内打包长期 API key（M3+ 强制 token exchange）。  
4. 版本标识：文件名建议含 `versionName-buildNumber-gitShortSha`，便于 M6 诊断对齐。

### 3.4 试用者安装说明（模板）

```text
1. 下载 my_brain-preview-1.0.0-42.apk
2. 设置 → 安全 → 安装未知应用 → 允许所用浏览器/文件管理器
3. 打开 APK 安装
4. 首次启动若提示麦克风权限，请允许（语音功能需要）
5. 若无法连接语音：请在 Settings 查看 Provider 状态是否为 mock/degraded
```

### 3.5 本地调试路径（可选）

| 方式 | 命令/工具 | 备注 |
|------|-----------|------|
| Expo Dev Client | `pnpm --filter @my-brain/mobile exec expo start --dev-client` | M2+ 需 Dev Client |
| USB 真机 | Android Studio + `adb install -r app.apk` | 开发迭代 |
| 模拟器 | Android Studio AVD | M1 smoke 可用；M3+ 语音有限 |

---

## 4. iOS `.ipa` 产出与 Sideloadly 自机安装

> **主路径**：Windows 11 → `eas build --platform ios` → 下载 `.ipa` → Sideloadly → 自用 iPhone。  
> **无 Mac**：不在本机运行 Xcode；签名由 EAS 云构建 + Sideloadly 二次签名（免费 Apple ID）组合完成。

### 4.1 前置条件

| 条件 | 必须 | 说明 |
|------|------|------|
| Expo 项目已 `eas init` | 是 | 绑定 `ios.bundleIdentifier` |
| `eas.json` iOS profile | 是 | 见 §4.2 |
| Apple ID（Sideloadly） | 是 | 免费或付费开发者账号 |
| Apple Developer Program | **否（当前）** | 见 §4.5 风险 |
| Mac / Xcode | **否** | EAS 云端编译 |

### 4.2 Build profile 要点

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "simulator": {
      "ios": { "simulator": true }
    }
  }
}
```

| Profile | 产物 | 用途 |
|---------|------|------|
| `development` / `preview` | 设备用 `.ipa`（或 EAS 提供的安装工件） | **Sideloadly 自机安装** |
| `simulator` | Simulator `.app` / zip | **Appetize 上传**（§5）；**不能**替代真机 gate |

**凭证策略（当前降级口径）：**

- **无 Apple Developer Program**：EAS iOS 设备构建可能要求 Ad Hoc / 内部证书或仅能产出 simulator 包——**必须在首次实测时记录 EAS 控制台报错与可行 profile**，写入 `docs/evals/ios-eas-first-build.md`。  
- 若 EAS 设备包无法在无付费账号下产出：fallback 为 **Android 真机 + iOS simulator Appetize** 做 UI smoke，iOS 真机 gate 标 **`NEEDS_DEVICE_EVIDENCE`**，直至付费开发者账号或可行 Ad Hoc 流程验证通过。

### 4.3 Windows 触发 EAS iOS 云构建

```powershell
cd D:\my_brain\apps\mobile
eas build --platform ios --profile preview
```

1. 按提示登录 Apple 账号（若 EAS 要求配置 credentials）。  
2. 等待云构建完成（记录 build ID、队列时长、额度）。  
3. 下载产物：

```powershell
eas build:download --platform ios --latest
```

或在 Expo 网页控制台下载 **`.ipa`**（或 EAS 标注的 iOS 安装包）。

### 4.4 Sideloadly 安装步骤

1. **安装 iTunes**（若尚未）并重启 Windows。  
2. **USB 连接 iPhone**，解锁手机，点「信任此电脑」。  
3. 打开 **Sideloadly**，确认左侧出现设备名称。  
4. 将下载的 **`.ipa`** 拖入 Sideloadly（或选择文件）。  
5. 输入用于签名的 **Apple ID**（建议使用非主力账号）。  
6. 点击 **Start**；等待签名与安装完成。  
7. 在 iPhone 上：**设置 → 通用 → VPN 与设备管理**（或「描述文件与设备管理」）→ 信任开发者 App。  
8. 启动 App，验证版本号与构建号与 EAS build 一致。

### 4.5 重签 / 有效期 / 信任 / 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| **App 约 7 天后无法打开** | 免费 Apple ID 签名有效期（常见 7 天） | 重新用 Sideloadly 安装同一 `.ipa`；记录重签日期 |
| **「无法验证 App」** | 未信任企业/开发者证书 | 设置 → 通用 → VPN 与设备管理 → 信任 |
| **Sideloadly 找不到设备** | 驱动/线缆/未信任 | 重装 iTunes、换线、重信任；重启手机与 PC |
| **安装失败：签名错误** | Bundle ID 与证书不匹配 | 确认 `ios.bundleIdentifier` 与 EAS 构建一致 |
| **麦克风/分享扩展不可用** | entitlements 在免费签名下被剥离或受限 | 标为 **待实测**；见 §6 风险矩阵；可能需要 Apple Developer + 正确 provisioning |
| **EAS 构建失败：No credentials** | 未配置 iOS 凭证 | 按 EAS 文档配置；无付费账号时记录 blocker |
| **安装后闪退（启动即退）** | Dev Client 与 JS bundle 不匹配、或缺少原生模块 | 用与构建 profile 匹配的 `expo start --dev-client` 或 embedded bundle 的 preview 包 |

**复验记录模板**（首次实测必填）：

| 字段 | 值 |
|------|-----|
| `eas_build_id` | |
| `profile` | preview / development |
| `apple_id_type` | free / paid developer |
| `install_tool` | Sideloadly x.x |
| `device` | iPhone 型号 + iOS 版本 |
| `first_install_at` | ISO8601 |
| `re_sign_due_at` | 首次安装 + 7 天（免费 ID 假设） |
| `entitlements_verified` | microphone / app-groups / share-extension：Y/N/未测 |

### 4.7 M2 iOS 备份排除设备证据（最短路径）

> Gate verifier 只接受结构化 JSON：`specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json`  
> 详见 [`reports/artifacts/README.md`](../reports/artifacts/README.md)

1. `cd D:\my_brain\apps\mobile` → `eas build --platform ios --profile development`（或已验证的 preview profile）。
2. 下载 `.ipa` → Sideloadly 安装到自用 iPhone（§4.4）。
3. USB 同网：`pnpm --filter @my-brain/mobile exec expo start --dev-client`（可选；embedded bundle 的 preview 包可跳过）。
4. iPhone 打开 App → 等待迁移完成 → **设置** → **生成 iOS 备份排除证据** → 分享 JSON 到 Windows。
5. 保存为 `D:\my_brain\specs\mobile-app\reports\artifacts\m2-ios-backup-exclusion-device-evidence.json`。
6. `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M2` — 期望 `m2-ios-backup-device-evidence: PASS` 后 M2-GATE 可签核 PASS。

### 4.8 与 Expo Dev Client 的关系

| 阶段 | iOS 包类型 | 说明 |
|------|------------|------|
| M0–M1 | Expo Go 或 Dev Client | Expo Go 无法覆盖 M3+ 原生语音 |
| M2+ | **Dev Client** `.ipa` | `expo-sqlite`、MigrationGate |
| M3–M6 | **Dev Client / preview** `.ipa` | 语音、Share Extension 须 native build |
| Appetize | **simulator** build | 与 Sideloadly 设备 `.ipa` **不同产物** |

---

## 5. Appetize 辅助演示流程

### 5.1 定位

- **适合**：远程观众查看 UI、导航、冷启动流程、mock 主路径、录屏素材。  
- **不适合**：替代 M6 双端真机 smoke、M3 barge-in 真机、M4 Share Extension 真机、M7 换机备份。  
- **Gate 规则**：Appetize 演示链接可在 M6 报告中列为 **`REMOTE_DEMO_ONLY`** artifact；**不得**作为 `m6-ios-smoke.md` 的唯一证据。

### 5.2 上传什么产物

| 平台 | 推荐上传 | 来源 |
|------|----------|------|
| iOS | Simulator `.app` 压缩为 `.zip` | `eas build --profile simulator` 或本地 `expo run:ios` 产出（需 Mac 时改由 EAS simulator 构建） |
| Android | `.apk` 或 Appetize 文档要求的格式 | EAS `preview` APK 通常可直接上传 |

**Windows 无 Mac 时的 iOS simulator 包**：优先使用 **EAS `simulator` profile** 云构建，下载后在 Windows 上打包上传 Appetize。

### 5.3 上传与分享（示例）

1. 登录 Appetize → Upload → 选择 `.zip` / `.apk`。  
2. 记录 **public key** 链接：`https://appetize.io/app/xxxxxx`。  
3. （可选）API 上传：

```powershell
# 伪示例 — 以 Appetize 当前 API 文档为准
curl -F "file=@my_brain-ios-sim.zip" -F "platform=ios" `
  -u "$env:APPETIZE_API_TOKEN:" https://api.appetize.io/v1/apps
```

4. 演示前在 Appetize 控制台检查：启动时间、横竖屏、麦克风是否模拟。

### 5.4 适合验证什么

| 能力 | Appetize 可信度 |
|------|-----------------|
| 页面路由与布局 | 高 |
| 冷启动 / AdaptiveRadar 骨架 | 中高（mock 数据） |
| 三意图按钮 / 文字闭环 | 中 |
| Settings / DegradedMode 展示 | 中 |
| 动效流畅度（粗评） | 中 |
| 离线只读（预置状态） | 低–中 |

### 5.5 不适合验证什么

| 能力 | 原因 | 真机证据要求 |
|------|------|--------------|
| **麦克风 + 实时语音** | 模拟器麦克风与延迟不真实 | M3 `NEEDS_DEVICE_EVIDENCE` → 自用 iPhone |
| **barge-in 打断** | 时序与 AudioSession 不可复现 | M3 真机录屏 |
| **Share Extension** | Appetize 不运行扩展进程 | M4 iOS 真机 |
| **Android intent 分享** | 需系统分享调度 | M4 Android 真机 |
| **App Group 暂存** | 扩展与主 App 跨进程 | M4 真机 + 审查清单 |
| **后台音频 / 锁屏恢复** | 模拟器策略不同 | M3/M6 真机 |
| **杀进程后 SQLite 恢复** | 沙箱持久化行为需真机 | M2/M6 真机 |
| **诊断导出 / Files** | 文件系统与分享面板 | M2/M6 真机 |
| **M6 双端 smoke** | Gate 硬需双端 dev/preview build | §8.1.1 结构化记录 |
| **M7 换机 / 加密备份** | 设备级加密与迁移 | M7 真机双实例 |

---

## 6. 真机能力风险矩阵

| 能力 | Android APK 分享 | iOS Sideloadly 自机 | Appetize | M 阶段 Gate | 风险 / 复验点 |
|------|------------------|---------------------|----------|-------------|---------------|
| **麦克风** | 真机可测 | 真机可测；免费签名 entitlement 待实测 | 不可靠 | M3 **NEEDS_DEVICE_EVIDENCE** | 权限文案、拒绝后文字兜底 |
| **barge-in** | 真机 | 真机 | 否 | M3 **NEEDS_DEVICE_EVIDENCE** | 延迟 P50、蓝牙耳机 |
| **Share Extension** | N/A | **高风险**（extension + App Group） | 否 | M4 **NEEDS_DEVICE_EVIDENCE** | 免费签名可能失败 → 评估 Apple Developer |
| **App Group** | N/A | **高风险** | 否 | M4 | 扩展与主 App 数据交换实测 |
| **Android intent 分享** | 真机 | N/A | 否 | M4 **NEEDS_DEVICE_EVIDENCE** | intent filter + 杀进程恢复 |
| **后台音频** | 真机 | 真机 | 否 | M3/M6 | 来电中断、锁屏 |
| **SQLite 持久化** | 真机 | 真机 | 部分 | M2/M6 | MigrationGate、杀进程 |
| **诊断导出** | 真机 | 真机 | 低 | M2/M6 | 白名单无敏感正文 |
| **M6 smoke 全路径** | 真机 dev/preview | 真机 dev/preview | **不替代** | M6 **硬需** | 缺一端 → `NEEDS_DEVICE_EVIDENCE` |
| **M7 备份/换机** | 真机双实例 | 真机双实例 | 否 | M7 **硬需** | 加密备份 round-trip |

**Apple 签名能力待实测清单**（首次 iOS 安装后填写）：

- [ ] 主 App 麦克风 entitlement 是否可用  
- [ ] Share Extension 是否出现在系统分享菜单  
- [ ] App Group 数据是否主 App 可读  
- [ ] 后台音频是否锁屏可续播  
- [ ] 7 天到期后重签是否同版本可覆盖安装  

若任一项 **FAIL** 且阻塞 M4/M3 gate：在 gate 报告中标 **`BLOCKED: sideload-entitlement`**，评估 **Apple Developer Program**（optional 升级），**不得** fake PASS。

---

## 7. Gate 关系：mock、真机证据与 Appetize

### 7.1 阶段与交付物对照

| 阶段 | 可用构建 | Windows 无 Mac 最低路径 | 真机证据 |
|------|----------|-------------------------|----------|
| **M0** | 无设备要求 | `expo start` 占位 | 否 |
| **M1** | Expo Go / Dev Client；APK 可分享 | Android 模拟器/真机；iOS 模拟器 Appetize 或 Sideloadly | 双端 smoke 建议 |
| **M2** | Dev Client | Android 真机；iOS Sideloadly | 杀进程恢复；**iOS 备份排除 JSON artifact** |
| **M3** | Dev Client **必须** | iOS Sideloadly + Android 真机 | **barge-in NEEDS_DEVICE_EVIDENCE** |
| **M4** | native build | Share Extension **仅 iOS 真机** | **分端 NEEDS_DEVICE_EVIDENCE** |
| **M5** | 同 M4 | 真机性能 P50 | Replay 真机 |
| **M6** | dev/preview | 双端真机 smoke **硬需** | Appetize = 补充 only |
| **M7** | 同 M6 | 双实例换机 | Appetize **无效** |

### 7.2 可先 mock 的能力（M0/M1）

- LLM / Radar / Voice provider → mock + DegradedMode 可见  
- 冷启动分流、AdaptiveRadar、三意图 **文字** 路径  
- Provisional 队列 UI（内存/mock）  
- 无 API key 完成 60s 个性化闭环（ingest 或 capture）

### 7.3 必须真机证据的能力（不可仅用 Appetize）

| Gate | 能力 | Verdict 若缺证据 |
|------|------|------------------|
| **M3-GATE** | barge-in、三意图语音一致 | `NEEDS_DEVICE_EVIDENCE` |
| **M4-GATE** | Android intent；iOS Share Extension | `NEEDS_DEVICE_EVIDENCE` |
| **M6-GATE** | iOS + Android 各 ≥1 台 dev/preview smoke | 缺一端 → `NEEDS_DEVICE_EVIDENCE` |
| **M7-GATE** | 换机、加密备份、同步冲突 | 真机双实例；Appetize 不适用 |

### 7.4 Appetize 在报告中的标注方式

```text
artifact_type: REMOTE_DEMO_ONLY
gate_credit: none
linked_paths: docs/evals/appetize-demo-link.md
notes: 不能替代 m6-ios-smoke.md / M3 barge-in 录屏
```

---

## 8. 安全注意

### 8.1 不要把长期 API key 打进包

- 禁止在 `app.json`、EAS env、`extra`、SQLite 中存放 `volcAccessKey`、`modelscopeApiKey` 等长期密钥。  
- M3 起：短期 token 仅 `expo-secure-store`；交换由 **token exchange BFF** 完成。  
- M3-GATE：`pnpm run scan:secrets` + bundle artifact grep 无长期密钥（见 [`EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) §7）。

### 8.2 Token exchange 最初本地 / LAN

| 项 | 建议 |
|----|------|
| **首版 BFF** | 本机 Node 服务或局域网可访问 URL |
| **生产** | 后续再迁云端；移动 App 只认 exchange URL 环境配置 |
| **Settings** | 显示 token exchange 失败原因与文字兜底 |

### 8.3 Sideloadly / Apple ID 凭证

- 不要在录屏、gate 报告、聊天中粘贴 Apple ID 密码。  
- 推荐专用 Apple ID；启用双重认证时使用 **app-specific password**（若 Sideloadly 支持）。  
- 他人 **不应** 获得你的 `.ipa` + Apple ID 组合（当前策略仅自机安装）。

### 8.4 APK 分享

- 只分享 **preview/production** 构建，勿分享含内部 BFF 调试 endpoint 的 dev 包（除非试用者可信且知情）。  
- 诊断导出包不含图谱正文 / transcript / 画像敏感字段（M2+ 白名单）。

### 8.5 Appetize Token

- `APPETIZE_API_TOKEN` 仅存本机环境变量或 CI secret。  
- 公开演示链接可设 session 时长与访问密码（若 Appetize 套餐支持）。

---

## 9. 父 agent 验收 Checklist（本 Runbook 完整性）

父 agent 验收本 Runbook 是否「可执行、可追踪、与 gate 对齐」时，使用下列清单。**全部勾选**视为文档交付 PASS。

### 9.1 文档结构

- [ ] 存在 `specs/mobile-app/runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md`  
- [ ] §1 明确目标与非目标（不上架、iOS 不分发他人、Android APK 可分享、自机 Sideloadly）  
- [ ] §2 环境清单含：Windows、Node/pnpm、EAS、Expo 账号、iTunes、Sideloadly、iPhone 信任、Appetize、Android Studio/adb 可选  
- [ ] §3 Android APK 流程完整（profile、构建、分享、安装说明）  
- [ ] §4 iOS 流程完整（EAS 云构建、profile、下载、Sideloadly、重签/信任/故障）  
- [ ] §5 Appetize 流程含适合/不适合验证范围  
- [ ] §6 真机能力风险矩阵含：麦克风、barge-in、Share Extension、App Group、后台音频、SQLite、诊断导出、M6 smoke  
- [ ] §7 Gate 关系含 M0/M1 mock 与 M3/M4/M6 `NEEDS_DEVICE_EVIDENCE`；Appetize 不替代 M6/M7  
- [ ] §8 安全注意含：密钥不进包、token exchange LAN、Sideloadly/Apple ID、APK 分享  
- [ ] §9 本验收 checklist 自身存在  

### 9.2 与仓库 spec 对齐

- [ ] 与 [`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) §0、§3.2、§16 optional 一致  
- [ ] 与 [`EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) §5.1 缺资源矩阵一致  
- [ ] 与 [`M6-release-observability-and-mobile-e2e.md`](../M6-release-observability-and-mobile-e2e.md) §8.1.1 smoke 证据字段一致  
- [ ] 未声称「无 Apple Developer 已解决 Share Extension」— 仅列风险与复验点  

### 9.3 指针与索引

- [ ] [`specs/mobile-app/README.md`](../README.md) 含本 Runbook 链接  
- [ ] （可选）[`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) 含交付 Runbook 指针  

### 9.4 故意未包含（不应误判为缺口）

- [ ] 未修改 `apps/mobile` 业务代码、`package.json` 脚本  
- [ ] 未执行 `pnpm install` / `eas build` 实测（实测留给 M0+ 与 `docs/evals/ios-eas-first-build.md`）  
- [ ] 未创建 git commit  

### 9.5 待实测项（文档交付后由实施阶段填写）

- [ ] 首次 EAS iOS `preview` 构建是否成功产出可安装 `.ipa`  
- [ ] Sideloadly 免费 Apple ID 签名有效期实测天数  
- [ ] Share Extension / App Group 在 Sideloadly 包上是否可用  
- [ ] EAS Free 月度额度与排队时间记录  

---

## 10. 相关文档

| 文档 | 关系 |
|------|------|
| [`../README.md`](../README.md) | M 系列索引 |
| [`../EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) | Gate 与 `NEEDS_DEVICE_EVIDENCE` |
| [`../M3-realtime-voice-and-token-exchange.md`](../M3-realtime-voice-and-token-exchange.md) | 语音真机矩阵 |
| [`../M4-quick-capture-and-provisional-queue.md`](../M4-quick-capture-and-provisional-queue.md) | 分享扩展 |
| [`../M6-release-observability-and-mobile-e2e.md`](../M6-release-observability-and-mobile-e2e.md) | 双端 smoke |
| [`../../../apps/mobile/README.md`](../../../apps/mobile/README.md) | 移动 App 落点 |
| [移动交付阻塞计划](file:///C:/Users/86155/.cursor/plans/移动交付阻塞_e4590469.plan.md) | P0 Runbook 来源 |

---

## 修订记录

| 日期 | 变更 |
|------|------|
| 2026-06-13 | 初版：Windows + EAS + Sideloadly + Appetize 交付 Runbook |
