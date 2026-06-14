# M1 Capture Loop — 60s 闭环 Eval

- **阶段**：M1 local-product-foundation
- **日期**：2026-06-13
- **环境**：无 API Key · 内存 provisionalStore · Expo Go 模拟器（Windows dev）
- **执行者**：composer2.5 子 agent

## 路径（capture loop）

1. `adaptive_live` 态点击 QuickCaptureFab「＋ 记下」
2. 输入 fixture `capture-idea-mock` 文案 → 加入「待点亮星尘」
3. ProvisionalQueueSheet 列表可见候选；**确认前** MemoryCore 节点数不变
4. 点「多说点」→ mock 解释，仍 `provisional_pending`
5. 点「记住这个」→ `confirmCandidate` → 星核点亮 + auto-curate 摘要
6. （可选）mock 链接 fixture → 「先不用」→ 候选消失

## 计时

| 步骤 | 耗时 |
|------|------|
| FAB 捕获 → 队列入列 | ~6s |
| 三意图确认入库 | ~10s |
| reject 路径 | ~5s |
| **合计** | **~21s**（< 60s） |

## Fixture 对齐

- `docs/evals/capture-loop-fixtures.json`：`capture-idea-mock` · `capture-link-fixture`

## 自动化证据

- `packages/core/provisional/queue.test.ts` — 确认前无 permanent PASS
- `apps/mobile/stores/provisionalStore.test.ts` — 内存队列 PASS

## 不变量

- ProvisionalCandidate **未确认**时 `graph.countVisibleNodes()` 不变
- confirm **唯一** permanent 出口

## 签核

- 子 agent：capture loop 落点已实现（FAB + Sheet + store + core/provisional）
- 父 agent：待签核
