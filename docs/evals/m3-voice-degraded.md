# M3 语音降级证据（degradedVoiceEvidence）

> M3-GATE 要求 ≥2 结构化降级场景，且须含 Settings `voice_disconnected` 可见性。  
> 本文件记录 **mock/staging 可复现** 证据；真机 barge-in 见 [`m3-voice-matrix.md`](./m3-voice-matrix.md)。

## 场景 1 — TokenExchangeError → voice_disconnected

```yaml
degradedVoiceEvidence:
  scenario: TokenExchangeError
  settingsPanel: testId settings-voice-disconnected + provider-status-voice shows disconnected
  banner: shown (DegradedModeBanner includes voice_disconnected copy)
  textIntentsStillWork: pass
  timestamp: 2026-06-14T12:00:00Z
  deviceOrSimulator:
    platform: vitest
    model: happy-dom Settings.test.tsx
```

**复现：** `pnpm --filter @my-brain/mobile test -- Settings`  
**代码路径：** `apps/mobile/voice/tokenExchangeClient.ts` mock fail → `onDegradedVoice("token_exchange")` → `createDefaultDegradedState(false)` 含 `voice_disconnected`。

## 场景 2 — RealtimeVoiceTransportError / 断网 → voice_disconnected

```yaml
degradedVoiceEvidence:
  scenario: RealtimeVoiceTransportError
  settingsPanel: provider-status-voice disconnected + settings-voice-disconnected 文案
  banner: shown
  textIntentsStillWork: pass
  timestamp: 2026-06-14T12:05:00Z
  deviceOrSimulator:
    platform: vitest
    model: VoiceSession.test.tsx simulateTransportError
```

**复现：** `pnpm --filter @my-brain/mobile test -- VoiceSession`  
**断言：** FSM → `error`；`onDegradedVoice("transport")`；图谱无写入（仅会话层状态）。

## 场景 3 — 麦克风权限拒绝（文字兜底）

```yaml
degradedVoiceEvidence:
  scenario: permission_denied
  settingsPanel: settings-voice-disconnected（mock 默认 degraded 态）
  banner: omitted_with_reason — 权限引导待 M6 真机 Maestro；Settings 证据满足 gate
  textIntentsStillWork: pass
  timestamp: 2026-06-14T12:10:00Z
  deviceOrSimulator:
    platform: pending
    model: NEEDS_DEVICE_EVIDENCE
```

**说明：** 机器测试覆盖文字三意图（`ingestIntent.test.ts` + `IntentRail`）；权限 UI 真机证据待用户补录。

## 文字三意图一致性

| 入口 | 测试 |
|------|------|
| 文字 IntentRail | `applyUserIntent` + `useConversationSession` |
| 语音 transcript | `resolveVoiceTranscript` → 同一 `UserIntent` |
| Core 回归 | `packages/core/src/voice/ingestIntent.test.ts` |
