# V2 接真 API Key 验收清单

> Mock-first 开发；本清单用于**验收期**切换真实 Provider 时的手工/半自动验收。架构真源见 `AGENTS.md`、`PRODUCT.md`。

## 语音（Realtime）

| 项 | Mock | 切真 | 验收 |
|---|---|---|---|
| Provider | `MockVoiceProvider` | `VITE_VOICE_PROVIDER=openai-realtime` + API key | 自检播报可听；`speak` / `setVoice`；用户打断时 TTS 立即停止（barge-in） |

## LLM

| 项 | Mock | 切真 | 验收 |
|---|---|---|---|
| Provider | `MockLlmProvider` | `VITE_LLM_PROVIDER=openai` + key | 资讯讲解、概念解释、画像蒸馏、persona 预设切换后语气变化 |

## 资讯

| 项 | Mock | 切真 | 验收 |
|---|---|---|---|
| NewsSource | mock RSS / GitHub | 真实 fetcher | 启动 loading 后 `newsQueue` 有条目；V2 briefing 可播报标题 |

## 记忆（EverMemOS）

| 项 | Mock | 切真 | 验收 |
|---|---|---|---|
| MemoryProvider | mock | EverMemOS sidecar | recall 注入对话上下文；**不得**写入图谱或画像表 |

## 入库（V3）

| 项 | Mock | 切真 | 验收 |
|---|---|---|---|
| 口令 | `parseIngestCommand` 文本 | 真实 STT | 「入 / 不要 / 讲细点」；歧义时 reprompt，二次 skip |

## 入库后整理（V4）

| 项 | Mock | 切真 | 验收 |
|---|---|---|---|
| autoCurate | 同逻辑 | 同逻辑 | 确认入库后出现 link/merge/archive 之一；`graph_history` 有记录；`undo` 恢复 before 快照 |

## 已知非本清单范围

- **H5 存储事务**：多步 persist 非原子；undo 依赖全量快照（见 `specs/README.md` 债务表）。
- **OpenAI 路径缺口**：部分 fail-fast 项见 `src/providers/llm/openaiLlmProvider.ts`；CI 默认 mock。

## 签字

- [ ] 语音
- [ ] LLM
- [ ] 资讯
- [ ] 记忆
- [ ] 入库
- [ ] 整理
