# V5 — 画像静默蒸馏与音色人格（`profile-voice`）

- **阶段：** V · **状态：** ✅ 已实现
- **上游：** V0、V2 · **下游：** V7
- **复用：** `voiceSessionFinalize`、`profileDistillation`、`profileStore`、C4 persona、`VoiceProvider`
- **依赖 / 前置里程碑：** **V0**（SettingsOverlay 壳）、**V2**（会话结束/轮次边界触发蒸馏）
- **可并行性：** 与 **V4**、**V6** 可并行

## 1. 目标
每次对话结束（或轮次切片）**静默蒸馏用户画像**，**无需用户确认**；复用 `finalizeVoiceSession` + `profileDistillation` + `profileStore.persist`。引入 **`VoiceTimbre`** 与 **`VoiceProvider.setVoice(timbre)`**（mock 断言所选 voice 参数；真实映射 OpenAI Realtime voice）。`SettingsOverlay` 增加 **音色 / 人格预设**；人格讲解风格随画像 **自调**（C4 已有钩子）。

## 2. 非目标
- 情感陪伴、恋爱向机制；仍是知识伴侣。
- 不让记忆引擎（EverMemOS）写画像（M 边界不变）；蒸馏走现有 LLM+本地 profile 表。
- 不在此 spec 改自动整理（V4）。

## 3. 契约

`VoiceProvider` 扩展与 **V1 §3 定稿同签**（不得分叉）：`speak(text, opts?)` + `setVoice(timbre)` + `getVoice()`；语义 = Realtime 会话内 response。真源签名见 `V1-launch-selfcheck.md` §3。

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

src/lib/voiceSessionFinalize.ts
  // 保持：输入 transcript 行 → distillProfilePatches → merge 进 profileStore
  // V5：由 useConversationSession / useVoiceSession 在 disconnect 或 companion 空闲时调用

src/hooks/useProfileDistillation.ts   // 可选薄封装：scheduleDistill(transcriptLines)

src/components/settings/SettingsOverlay.tsx
  // 音色：Radio/列表 → voice.setVoice
  // 人格：persona preset 选择 → personaStore / profile 联动
  // API key：验收期项，mock 可隐藏或只读提示

src/stores/profileStore.ts
  // 确保 persist 后 explanationStyle / interests 等字段反映蒸馏结果
```

- Mock：`MockVoiceProvider.setVoice` 记录 `lastTimbre`，测试 `getVoice()`。
- OpenAI：`OpenAiRealtimeVoiceProvider.setVoice` 更新 session voice 参数（验收期实现，V7 清单列出）。

## 4. 数据结构 / store
| 类型 | 说明 |
|---|---|
| `UserProfile` | 永久生长字段；蒸馏补丁合并策略不变 |
| `profileStore` | `profile`, `loadFromStorage`, `save` |
| localStorage/SQLite | `user_profile` 表 |

## 5. 验收清单
- [x] 模拟一轮对话 transcript → `finalizeVoiceSession` → profile 字段变化可断言（mock LLM fixture）。
- [x] **无** UI 确认弹窗；蒸馏失败降级日志，不阻塞 companion。
- [x] `setVoice` mock：切换音色后 `getVoice` 更新；Settings 操作可追溯。
- [x] 人格预设切换后 `buildExpressionPlan` 输出变化（复用 C4 测试）。
- [x] 记忆引擎模块仍 **无** `profileStore.save` / 图谱写（invariant 扫描）。

## 6. 涉及不变量
- **画像永久、静默生长**（v2 明确无需确认）。
- **记忆边界**：记忆引擎只写蒸馏文本入 memory provider，**不写** profile 表/图谱；profile 蒸馏走 `profileDistillation` 路径。
- 本地优先；mock-first。

## 7. 测试（harness）
- `voiceSessionFinalize.test.ts` 扩展会话切片。
- `mockVoiceProvider.test.ts`：`setVoice`/`getVoice`。
- `profileDistillation.test.ts` 回归。
- `SettingsOverlay.test.tsx`：音色/人格控件存在且回调。

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| 蒸馏误写兴趣 | 补丁合并保守；仅增量字段 |
| OpenAI 未实现 setVoice | mock 验收；V7 接真 |

## 9. DoD
`pnpm check` 全绿；mock 演示改音色 + 聊完 profile 字段变化；相关 `*.test.ts` 通过。
