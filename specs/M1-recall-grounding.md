# M1 — 召回式 grounding（`recall-grounding`）

- **阶段：** B 段开端（紧跟 M0）· **状态：** ✅ 已实现
- **上游：** M0（`MemoryProvider`）、现有 `useNewsIngestSession`/`VoicePanel`/`LlmProvider`· **下游：** B1（研究链复用）、C1（画像驱动）、H3（召回质量评测）

## 1. 目标
把"先回忆、再回答"接进现有链路：在 `summarize` / `explain` / `propose` / 语音应答**之前**，用 `MemoryProvider.recall(query)` 取回相关记忆，按 **80% 相关 / 20% 稳定**混合注入 LLM 上下文，让回复自然"想起来"而非每次从零开始（对标 EverCore 重构召回 + OpenHer 异步两阶段召回）。同时在对话结束时把**蒸馏后**的情节/事实写回记忆（`remember`）。

## 2. 非目标
- 不改 `MemoryProvider` 接口（M0 已定）。
- 不写图谱/画像（只读注入；落库仍走收件箱）。
- 不写入任何原始音频/全文（只写蒸馏文本，复用现有 `profileDistillation`/`voiceSessionFinalize` 的蒸馏产物）。

## 3. 契约
```
src/lib/memoryGrounding.ts
  buildGroundingContext(recalled: RecalledMemory[], opts): string   // 80/20 混合，纯函数
  selectRecallMix(recalled, { relevantRatio: 0.8, stableRatio: 0.2 }): RecalledMemory[]
```
- 注入点（只在构造 LLM 上下文处加一段 `<memory>` 前缀，不改 Provider 接口）：
  - `useNewsIngestSession.requestIngest`：`propose` 前 recall 与当前资讯相关记忆。
  - `explainCurrent` / 语音讲解：`explain` 前 recall 用户对该主题的历史。
- 回写：对话/会话结束（`voiceSessionFinalize`）时，把蒸馏出的情节摘要 + 事实 `remember(...)`（与现有写画像同一时机，**同一份蒸馏纯文本**，不重复保留原文）。
- 降级：`recall` 返回 `[]`（M0 sidecar 不可用）时，链路行为与今天一致（无 grounding），不报错。

## 4. 验收清单
- [x] `propose`/`explain` 前确有 recall 调用，注入的上下文含召回记忆且不超预算（与 H1 token 护栏协同）。
- [x] 80/20 混合策略由 `selectRecallMix` 决定，有单测覆盖边界（不足 topK、空集）。
- [x] 会话结束回写的是蒸馏文本（断言不含原始 transcript 全文）。
- [x] sidecar 不可用时优雅降级，链路不报错（行为回退到今天）。
- [x] 截图/日志：同一主题二次对话，回复体现"记得上次"（`recallGroundingFlow.test.ts` 二次 recall 用例替代手工截图）。

## 5. 测试（harness）
- `memoryGrounding.test.ts`：`selectRecallMix` 比例/边界；`buildGroundingContext` 输出格式与长度上限。
- 注入点交互测试（mock `MemoryProvider`）：`propose`/`explain` 前调用 `recall`；会话结束调用 `remember` 且入参为蒸馏文本。
- 降级测试：`recall→[]` 时链路与基线一致。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 召回内容撑爆上下文/涨成本 | `buildGroundingContext` 设长度上限；token 计入 trace，跟 H1 护栏 |
| 召回噪声拉低回答质量 | 80/20 混合 + topK 限制；H3 评测召回质量并回归 |
| 误把原文写进记忆 | 复用既有蒸馏产物；测试断言 remember 入参为蒸馏文本 |

## 7. DoD
`pnpm check` 全绿；注入/回写均只用蒸馏文本；降级零回归；二次对话"记得上次"截图通过。
