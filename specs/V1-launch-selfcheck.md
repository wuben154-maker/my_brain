# V1 — 电影感启动与语音自检（`launch-selfcheck`）

- **阶段：** V · **状态：** 📝 待实现
- **上游：** V0 · **下游：** V2
- **复用：** `lib/bootSelfCheck.ts`、`runLaunchSequence.ts`、`LaunchScene` 子组件
- **依赖 / 前置里程碑：** **V0**（`LaunchPhase` 与 `LaunchScene` 外壳）
- **可并行性：** 与 V5/V6 的视觉打磨可并行，但须在 V2 之前完成启动链

## 1. 目标
把开机流程做成**电影感 LaunchScene**（**动画从 `boot` 态起**，非自检后才开场）：`boot`（黑场 + logo 短屏）→ `self_check`（语音逐条自检）→ `loading`（数据注入大脑）→ `companion`。复用 `createBootCheckDefinitions`；经 **`speakSelfCheck` + `VoiceProvider.speak`** 播报（mock 可断言）。任一项失败：**语音说明 + 优雅降级**；用户可 **barge-in 跳过**。

## 2. 非目标
- 不实现对话编排（V2）、资讯 briefing 内容生成（V2/V3）。
- 不改自检项的业务定义（仍由 `bootSelfCheck` 真源）；仅增加语音输出层与 UI 包装。
- 不接真实 OpenAI Realtime（验收期）；mock `VoiceProvider.speak` 即可。

## 3. 契约

### VoiceProvider 扩展（定稿，V1/V5 同签；mock 与 openai **必须**实现）

语义 = **OpenAI Realtime 会话内 assistant response**（非独立 REST TTS）。`speak` 在已 `connect` 的会话上发起一轮可打断的口播。

```
src/providers/voice/types.ts
  export type VoiceTimbre =
    | "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

  export interface VoiceProvider {
    readonly id: string;
    connect(config: VoiceProviderConfig): Promise<void>;
    disconnect(): Promise<void>;
    interrupt(): Promise<void>;
    speak(text: string, opts?: { interruptible?: boolean }): Promise<void>;
    setVoice(timbre: VoiceTimbre): void;
    getVoice(): VoiceTimbre;
    getState(): VoiceConnectionState;
    onStateChange(listener: (state: VoiceConnectionState) => void): () => void;
    onTranscript(listener: (event: VoiceTranscriptEvent) => void): () => void;
    onSpeakProgress?(listener: (evt: { text: string; chunk?: string }) => void): () => void;
  }
  // MockVoiceProvider：speak 逐条 emit onSpeakProgress；setVoice 更新 getVoice()
  // OpenAiRealtimeVoiceProvider：speak → response.create；setVoice → session voice 参数
```

```
src/lib/speakSelfCheck.ts
  speakSelfCheck(
    items: SelfCheckItem[],
    voice: VoiceProvider,
    opts?: { onItemStart?: (id: string) => void; signal?: AbortSignal },
  ): Promise<{ spoken: string[]; skipped: boolean }>;

src/lib/runLaunchSequence.ts
  // 序列定稿（与 V0 LaunchPhase 一致）：
  // boot：setPhase("boot")，展示 BootIntroScreen（V1 电影化），最短展示 BOOT_INTRO_MS
  // self_check：跑 defs + speakSelfCheck(voice.speak) + UI 同步勾选项
  // loading：抓取资讯填入 appStore.newsQueue（供 V2 briefing，不产审批提议，见 V4/V7）
  // companion：setPhase("companion")；V2 接管伴侣登场首条 Turn（含冷启动脚本）

src/components/launch/LaunchScene.tsx
  // boot 由 BootIntroScreen；self_check/loading 在本组件；skip → voice.interrupt()
```

- 自检失败：`status: warn|error` 项仍写入 `selfChecks`；`speakSelfCheck` 口播「该项异常，将降级继续」类文案；**不得**无限重试阻塞进入 `loading`（可配置 `BOOT_ALLOW_DEGRADED=true` 默认 true）。
- `loading` 阶段继续现有 `newsQueue` 填充逻辑；动画与 `loadingMessage` 联动（科幻 copy，中文）。

## 4. 数据结构 / store
| 字段 | 说明 |
|---|---|
| `appStore.selfChecks` | 与播报顺序一致；UI 勾选项随 `onItemStart` 高亮 |
| `appStore.bootLogs` | 保留文本日志供调试；与语音内容可相同源 |
| `appStore.phase` | `boot` → `self_check` → `loading` → `companion` |

## 5. 验收清单
- [ ] `boot` 态：黑场 + logo 可见，且 phase 序列以 `boot` 开头（非仅日志）。
- [ ] mock voice：`speakSelfCheck` 对 N 项自检依次 `speak`，测试断言顺序与 label 含关键字（麦克风/扬声器等）。
- [ ] 全部 ok 路径：`runLaunchSequence` 结束 phase=`companion` 且 `newsQueue` 已填充（与现逻辑一致）。
- [ ] 单项失败：语音错误反馈 + 进入 `loading`/`companion`（降级），phase 不为永久 `error`（除非 storage 致命失败）。
- [ ] 用户打断：`voice.interrupt()` 后跳过剩余播报，序列继续（不挂死）。
- [ ] Loading 动画可见且与抓取进度文案联动。

## 6. 涉及不变量
- 可打断语音（硬需求）：自检播报必须可 interrupt。
- 本地优先；mock-first，无真实 key。
- Provider 可替换：`speak` 为接口扩展，mock/openai 同步签名。

## 7. 测试（harness）
- `speakSelfCheck.test.ts`：顺序、跳过、AbortSignal。
- `runLaunchSequence.test.ts`：phase 迁移、降级、newsQueue。
- `mockVoiceProvider.test.ts`：`speak` emit 事件。

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| OpenAI Realtime 无独立 REST TTS | 真实实现 = 会话内 `response.create`（与 speak 语义一致）；V1 以 mock 验收 |
| 自检+语音拉长启动 | 可跳过；`BOOT_MIN_TOTAL_MS` 与电影感动画并行 |

## 9. DoD
`pnpm check` 全绿；mock 可演示完整启动链（含语音事件日志）；`speakSelfCheck.test.ts` + `runLaunchSequence` 相关测试通过。
