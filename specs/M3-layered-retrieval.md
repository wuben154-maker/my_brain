# M3 — 分层 coarse-to-fine 检索（`layered-retrieval`）

- **阶段：** B 段（紧跟 B 研究链 / 配合 N3）· **状态：** 📝 待做
- **上游：** M0/M1（记忆引擎与召回）、现有图谱与缩放分层· **下游：** N3（思维导图）、G1（3D 分层）、串讲高亮

## 1. 目标
把记忆与图谱组织成**「主题 → 概念/事件 → 事实」三层**，召回时**由粗到细**（先定位主题簇，再下钻具体事实），并让这套层级**复用为前端缩放粒度**（脑区团 → 概念 → 细节），呼应 PRODUCT.md「可缩放分层」与 HyperMem 的 topic/event/fact 架构。

## 2. 非目标
- 不替换 M0 接口；分层是 `recall` 之上的**检索策略 + 视图组织**，不是新引擎。
- 不改图谱落库/结构变更通道。

## 3. 契约
```
src/lib/memoryLayers.ts （纯函数）
  type MemoryLayer = "topic" | "concept" | "fact";
  layerOf(item | node): MemoryLayer
  coarseToFineRecall(provider: MemoryProvider, query, { maxPerLayer }): Promise<RecalledMemory[]>
    // 先 topic 粗召回 → 命中主题下再 concept/fact 细召回，结果合并去重
  groupByLayer(items): Record<MemoryLayer, ...>   // 供缩放/大纲消费
```
- 召回策略：`coarseToFineRecall` 调用 M0 `recall`（或 EverMemOS 分层接口）两段式收敛；上层（M1 grounding、B 研究）改用它取更聚焦的上下文。
- 视图复用：星图缩放层级与 N3 大纲层级统一映射到 `MemoryLayer`（zoom-out=topic 簇，zoom-in=fact）。
- 纯函数、确定性，便于测试与 H3 评测。

## 4. 验收清单
- [ ] `layerOf`/`groupByLayer` 分层正确、确定性。
- [ ] `coarseToFineRecall` 先粗后细、合并去重，召回较单层更聚焦（H3 可量化）。
- [ ] 缩放层级 ↔ `MemoryLayer` 映射一致（与 G1/N3 对齐，避免各做一套）。
- [ ] sidecar 不可用时降级为单层/空召回，不报错。

## 5. 测试（harness）
- `memoryLayers.test.ts`：分层、分组、coarse-to-fine 收敛、去重、空集/降级。
- 与 M1 联动：grounding 切换到分层召回后上下文更聚焦（mock 断言调用序列）。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 两段召回延迟翻倍 | `maxPerLayer` 限制 + 仅在需要时下钻；缓存粗层结果 |
| 与缩放视图各做一套层级 | 单一 `MemoryLayer` 真源，G1/N3 复用 |

## 7. DoD
`pnpm check` 全绿；分层纯函数确定性；缩放/大纲共用同一层级真源；降级安全。
