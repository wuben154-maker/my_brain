# M3 双端语音验收矩阵

> 对齐 [`docs/MOBILE_PRODUCT_PLAN.md`](../MOBILE_PRODUCT_PLAN.md) §4.4 与 [`M3-realtime-voice-and-token-exchange.md`](../../specs/mobile-app/M3-realtime-voice-and-token-exchange.md) §5.1。  
> **M3-GATE 判定：** 机器测试 PASS + 本矩阵真机项缺证据 → **NEEDS_DEVICE_EVIDENCE**（非 FAIL 非 FULL PASS）。

| 场景 | Android 验收 | iOS 验收 | 共同要求 | 机器证据 | 真机证据 |
|------|-------------|----------|----------|----------|----------|
| 音频会话 | AudioFocus 模拟 `audioFocus.test.ts` | AVAudioSession 模拟 `audioSession.test.ts` | 抢焦点时 TTS 暂停 | PASS (Vitest) | **待补** |
| 蓝牙耳机 | 路由切换（ADR 0003） | Bluetooth 路由模拟 | 插话可 barge-in | mock transport PASS | **待补** |
| 系统中断 | `simulateFocusLossTransient` | `simulateInterruption` | 恢复后文字可用 | PASS (Vitest) | **待补** |
| 锁屏/后台 | ADR 0003 定义暂停策略 | 同上 | 切回状态一致 | ADR 落盘 | **待补** |
| 权限撤销 | 文字兜底 | 文字兜底 | 三意图仍可用 | Settings 面板 PASS | **待补** |
| 弱网/断连 | transport error → degraded | 同上 | 不污染图谱 | VoiceSession.test PASS | **待补** |
| barge-in 延迟 | 真机 P50 <300ms | 真机 P50 <300ms | mock 队列立即 interrupt；Settings **M3 语音插话诊断** 面板录屏 | `mockRealtime.test.ts` PASS | **NEEDS_DEVICE_EVIDENCE** |
| 权限文案 | RECORD_AUDIO 说明 | NSMicrophoneUsageDescription | 商店文案草案 | app.json 待 M6 | **待补** |

## 已采集机器证据

- `pnpm --filter @my-brain/core test -- ingestIntent` — 三意图 FSM 一致
- `pnpm --filter @my-brain/mobile test -- VoiceSession mockRealtime audioFocus audioSession Settings M3Voice tokenExchange` — 状态机 + 降级 + Settings `voice_disconnected` + **M3 语音插话诊断面板**
- ADR：`docs/adr/0002-mobile-token-exchange.md`、`docs/adr/0003-rn-native-voice-transport-ws-headers.md`

## 真机补录指引

1. Dev Client / preview build **重装**（见 `runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md`）。
2. 打开 App → 首页右上角 `···` → **设置** → 找到 **「M3 语音插话诊断（Dev Client）」** 面板（mock transport 横幅必须可见）。
3. 录屏全程保留以下 UI 字段：**Platform / OS Version / Build / FSM / 播放中 / stopLatencyMs / 证据模板**。
4. 操作顺序：**连接语音（mock token）** → **开始长播报（10 秒）**（确认 **FSM：speaking**、**播放中：是** 保持约 10 秒）→ **插话停止** → （可选）**模拟断连/降级** → **分享/复制证据模板**。
5. 录屏文件命名建议：`m3-barge-in-<platform>-<deviceModel>-<YYYYMMDD>.mp4`；在证据模板中填写 `deviceModel` 与 `videoFile`。
6. 将 iOS + Android 双端证据 YAML 填回本表 **barge-in 延迟** 行（及对应场景行）；**不要把真机项标 PASS**，待父 agent 复验 `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M3`。
7. 父 agent 复验后可将 M3-GATE 从 `NEEDS_DEVICE_EVIDENCE` 升级为 PASS（若其余 checklist 满足）。

## iOS connected prep status（2026-06-15，子 agent 只读检测）

> **Gate 状态未变**：真机 barge-in 仍为 **NEEDS_DEVICE_EVIDENCE**；本节仅记录 Windows + iPhone 连线后的采证准备，**非 PASS**。

| 项 | 状态 |
|----|------|
| Windows USB 识别 iPhone | **OK**（`Apple Mobile Device USB Composite Device` / `Apple iPhone` WPD 可见） |
| 本机可安装 `.ipa` | **否**（仓库与 Downloads/Desktop 均未发现 `.ipa`） |
| EAS 历史 iOS build | **无**（`eas build:list --platform ios --limit 3` 为空） |
| Sideloadly | **未检测到**（标准安装路径无 `Sideloadly.exe`） |
| iTunes（Windows 驱动） | **未检测到**（标准路径无 `iTunes.exe`；USB 仍可见，Sideloadly 安装后需再确认） |
| EAS CLI / Expo 登录 | **已登录**（`eas whoami` → owner `gogogogogo`，与 `app.json` 一致） |
| 机器测试（M3 诊断 UI） | **PASS**（`M3VoiceDiagnosticsPanel.test.tsx`、`Settings.test.tsx` barge-in 入口） |

**采证准备结论：** `needs user action` — 需先产出 Dev Client `.ipa` 并用 Sideloadly 安装，再按上文「真机补录指引」录屏。

**建议下一步（需用户确认后再执行 EAS 构建）：**

```powershell
cd D:\my_brain\apps\mobile
eas build --platform ios --profile development
eas build:download --platform ios --latest
```

- 构建会消耗 EAS 云额度，并可能交互式要求 **Apple ID / iOS 凭证**（免费 Apple ID 或 Developer Program 待首次实测记录）。
- 安装：Sideloadly 拖入 `.ipa` → 输入 Apple ID 签名 → iPhone **设置 → 通用 → VPN 与设备管理** 信任 → App 内 **··· → 设置 → M3 语音插话诊断（Dev Client）**。

## iOS 真机可见性记录（2026-06-15）

> **Gate 状态未变**：本节仅记录 Dev Client 已安装且 M3 诊断入口可见；**barge-in 延迟** 行仍为 **NEEDS_DEVICE_EVIDENCE**（**非 PASS**，缺录屏 + 证据 YAML）。

| 项 | 值 |
|----|-----|
| 记录时间 | 2026-06-15（用户会话人工确认） |
| GitHub Actions run | `27524282961`（success） |
| IPA 路径（仓库 artifact） | `specs/mobile-app/reports/artifacts/github-ios-dev-ipa/mybrain.ipa` |
| Bundle ID | `app.mybrain.personal` |
| 已安装包（tidevice applist） | `app.mybrain.personal` · display `my_brain` · version `0.0.0` |
| 用户确认 | App 内 **设置** 可见 **「M3 语音插话诊断（Dev Client）」** |
| barge-in 真机证据 | **仍待补**（需录屏 + 下方 YAML 字段） |

## iOS barge-in 录屏步骤（待用户执行）

**前置：** 上述 IPA 已安装；入口已可见。本节不标 PASS，仅指导采证。

### 1. 开始录屏（录屏须覆盖全程）

1. iPhone **控制中心 → 屏幕录制** 开始（或 **设置 → 控制中心** 先添加「屏幕录制」）。
2. 打开 **my_brain** → 首页右上角 **`···`** → **设置**。
3. 滚动至 **「M3 语音插话诊断（Dev Client）」**；确认横幅 **「长播报采证模式 · mock transport · …」** 与 **开始长播报（10 秒）** 按钮在录屏内可见。

### 2. 面板操作顺序（与 Android 一致）

| 步骤 | 按钮 | 录屏须可见的 UI |
|------|------|----------------|
| 1 | **连接语音（mock token）** | FSM 变化；无 `connectError` |
| 2 | **开始长播报（10 秒）** | FSM → `speaking`；**播放中：是**（应保持约 10 秒，勿立即点插话） |
| 3 | **插话停止** | **stopLatencyMs（mock 近似）** 出现；**插话结果：stopped** |
| 4（可选） | **模拟断连 / 降级** | FSM / lastError 变化 |
| 5 | **分享 / 复制证据模板** | 证据模板 YAML 全文在录屏内可读 |

### 3. 结束录屏与文件命名

1. 停止屏幕录制；保存到相册/文件。
2. 文件名建议：`m3-barge-in-ios-<deviceModel>-20260615.mp4`（例：`m3-barge-in-ios-iPhone15Pro-20260615.mp4`）。
3. 将录屏文件路径或文件名填入下方 YAML 的 `videoFile`（可相对 `specs/mobile-app/reports/artifacts/` 或绝对路径）。

### 4. 证据 YAML 模板（填好后交给父 agent，勿自行标 PASS）

操作完成后，在面板 **证据模板** 中核对字段，并手动补全 `(待填写)` 项。复制完整 YAML 发回父 agent（或粘贴到本文件 **barge-in 延迟** 行下方的 iOS 证据区——**仍保持 NEEDS_DEVICE_EVIDENCE，待 gate 复验**）：

```yaml
m3VoiceBargeInEvidence:
  platform: ios
  osVersion: "<面板 OS Version，例 18.x>"
  build: "<面板 Build / Runtime>"
  deviceModel: "<例 iPhone15,2 或 iPhone 15 Pro>"
  recordedAt: "<ISO8601，例 2026-06-15T14:30:00+08:00>"
  bargeInStopLatencyMs: <面板 stopLatencyMs 数值>
  result: stopped
  videoFile: "m3-barge-in-ios-<deviceModel>-20260615.mp4"
  transportMode: "mock transport / 真机诊断辅助，不等于 live provider"
  fsmState: "<插话后 FSM，通常 idle 或 listening>"
  githubActionsRunId: "27524282961"
  ipaArtifact: "specs/mobile-app/reports/artifacts/github-ios-dev-ipa/mybrain.ipa"
  bundleId: "app.mybrain.personal"
```

**验收口径提醒：** `bargeInStopLatencyMs` 为 mock transport 近似值；M3-GATE 真机项 PASS 须父 agent 在收齐 **iOS + Android** 双端录屏与 YAML 后执行 `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M3` 复验。**Android 端尚未完成，当前仅 iOS 可见性已确认。**

## iOS barge-in attempt 1（invalid / needs redo）

> **Gate 状态未变**：**barge-in 延迟** 行仍为 **NEEDS_DEVICE_EVIDENCE**（**非 PASS**）。本节记录首次用户提交的录屏与 YAML；因操作顺序错误，**不可作为有效 barge-in 真机证据**。

| 项 | 值 |
|----|-----|
| 校验时间 | 2026-06-15（子 agent 只读校验） |
| 录屏文件 | `6aea87c206c2ca6e9a41867bccf5da4d.mp4` |
| 录屏路径 | `D:\电脑管家迁移文件\xwechat_files\wxid_39fdl1s5newb22_14cc\msg\video\2026-06\6aea87c206c2ca6e9a41867bccf5da4d.mp4` |
| 文件大小 | 297 510 bytes（~291 KB） |
| 文件修改时间 | 2026-06-15 13:37:36（本地） |
| ffprobe 时长 | ~15.5 s；220×480 H.264 + AAC；`creation_time` 2026-06-15T05:38:38Z |
| 结论 | **invalid — needs redo** |

**用户提交的 YAML 字段：**

```yaml
m3VoiceBargeInEvidence:
  platform: ios
  osVersion: 26.2
  build: dev/mock
  deviceModel: (待填写)
  recordedAt: 2026-06-15T05:37:28.768Z
  bargeInStopLatencyMs: null
  result: skipped_not_speaking
  videoFile: (待填写录屏文件名)
  transportMode: mock transport / 真机诊断辅助，不等于 live provider
  fsmState: listening
```

**失败原因（对照矩阵「真机补录指引」与 `M3VoiceDiagnosticsPanel` 语义）：**

1. **`result: skipped_not_speaking`** — 点击「插话停止」时 FSM 非 `speaking`（面板在 `voice.state !== "speaking"` 时写入此结果）；与录屏须见的 **播放中：是 / FSM：speaking** 前置条件不符。
2. **`bargeInStopLatencyMs: null`** — 未产生 mock stop 延迟数值；有效证据须为 **正整数 ms**（面板 `stopLatencyMs`）。
3. **`fsmState: listening`** — 插话时助手未处于播报态，说明 **「开始长播报（10 秒）」未成功或未在 speaking/播放中 后再点插话**。
4. **`deviceModel` / `videoFile` 仍为占位** — 矩阵要求手动补全设备型号与录屏文件名（建议 `m3-barge-in-ios-<deviceModel>-YYYYMMDD.mp4`）。
5. 录屏文件 **存在且为真机屏幕录制**，但 YAML 与面板逻辑表明 **未执行有效 barge-in 测量**；单独存在 mp4 **不足以** 将 barge-in 行标 PASS。

**重录最小步骤（用户）：** 见上文「iOS barge-in 录屏步骤」— 必须先 **连接语音（mock token）** → **开始长播报（10 秒）**（确认 **播放中：是**、**FSM：speaking** 并保持数秒）→ **插话停止**（期望 **stopLatencyMs** 数值 + **插话结果：stopped** + YAML `result: stopped`）→ 补全 `deviceModel` / `videoFile` 后再提交。

> **2026-06-15 修复说明：** 旧版「模拟助手播报」仅约 0.16s（4×40ms chunk），真机来不及点插话；现改为 **10 秒长播报采证模式**，需重装含本修复的 Dev Client `.ipa` 后再录屏。
