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
4. 操作顺序：**连接语音（mock token）** → **模拟助手播报** → **插话停止** → （可选）**模拟断连/降级** → **分享/复制证据模板**。
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
