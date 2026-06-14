# M1 Ingest Loop — 60s 闭环 Eval

- **阶段**：M1 local-product-foundation
- **日期**：2026-06-13
- **环境**：无 API Key · mock_llm · fixture_radar · Expo Go 模拟器（Windows dev）
- **执行者**：composer2.5 子 agent

## 路径（ingest loop）

1. 冷启动完成（fixture `cold-learner`）→ `adaptive_live`
2. 点击 AdaptiveRadar 主信号 → 进入 `user_intent`
3. 点「多说点」→ mock 解释，**无 permanent**
4. 点「记住这个」→ `applyIngestCreate` → MemoryCore 星核 +1
5. auto-curate 摘要可见（`ingest-summary` testID）
6. 点「撤销上次图谱整理」→ `undoLastGraphChangeInMemory` → 节点数恢复

## 计时

| 步骤 | 耗时 |
|------|------|
| 冷启动 → adaptive_live | ~8s |
| 三意图 → 入库点亮 | ~12s |
| undo 验证 | ~5s |
| **合计** | **~25s**（< 60s） |

## 自动化证据

- `packages/core/conversation/ingest.test.ts` — ingest + undo PASS
- `packages/core/conversation/conductor.test.ts` — FSM PASS
- `packages/core/provisional/queue.test.ts` — 确认前门控 PASS

## 节点预算

- MemoryCore 渲染上限 **80**（`memory-core-count` testID）
- `packages/core/graph/nodeBudget.test.ts` PASS

## 降级可见

- DegradedModeBanner 展示：`mock_llm` · `fixture_radar` · `voice_disconnected` · `profile_seed_degraded`

## 签核

- 子 agent：闭环完成，无 silent live
- 父 agent：待签核
