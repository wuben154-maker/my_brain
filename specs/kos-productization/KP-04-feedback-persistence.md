# KP-04 — Feedback 持久化与排序闭环（`feedback-persistence`）

- **阶段：** KP Phase 2 · **状态：** planned
- **上游：** KP-01、KOS-B3 · **下游：** KP-05、KP-09
- **依赖 / 前置里程碑：** KP-01 默认 Radar 有 briefing；KOS-B3 feedback 会话权重已实现
- **可并行性：** 可与 KP-03 并行（本 spec 依赖 KP-01，非 KP-00）；store 层可与 Review UI 分工

## 定位

用户说「不要 / 已知道 / 太浅 / 太深」后，**下一轮** Radar 排序或讲解应可观察地变化。把 `briefingStore` feedback 从单次 UI 状态升级为 **可持久、可 replay** 的闭环输入。

## 目标

1. `BriefingFeedback` 写入 store + **SQLite 持久化**（或项目既定 storage 层）。
2. 下一次 `runRadarBriefing` / `scoreWorldItems`（承载 ranking 逻辑）**读取** feedback 调整权重。
3. UI/语音路径提供 feedback 入口（chip 或口令映射）。
4. 同主题/同 WorldItem 在不同 feedback 下 top3 **可测**变化。
5. **`too_shallow` / `too_deep` 语义**：item/主题级反馈，仅影响该条及同主题的讲解深度，**不得**直接修改全局默认讲解深度；全局深度偏好属于 KP-05 profile correction。
6. feedback **不写**永久图谱/画像（权重层 only；画像修正见 KP-05）。

## 非目标

- 不做 profile 修正 UI 与 teaching depth 全链路（KP-05）。
- 不改 Weekly Review 主路径（KP-03）。
- 不把 feedback 当作 ingest 确认。
- 不做跨设备 sync。

## 涉及文件/模块

```
src/stores/briefingStore.ts
src/domain/radar/briefingItem.ts           # BriefingFeedback
src/radar/scoreWorldItems.ts               # 读 feedback 权重（ranking 逻辑）
src/lib/runLaunchSequence.ts               # 下次 launch rerank
src/storage/briefingFeedbackRepo.ts        # 新增：持久化
src/components/briefing/BriefingSignalChip.tsx  # feedback 入口
```

## 用户可见流程或数据流

```
用户看 top3 → 标记 not_interested / already_know / too_shallow / too_deep
  → feedback 持久化
  → 下次启动或 harness rerank
  → 被标记项降权或 elaboration depth 变化
  → UI/语音可感知「推荐变了」
```

## 验收清单

- [ ] feedback 重启后仍存在（SQLite/storage 断言）。
- [ ] `not_interested` / `already_know` 后，同 id **排除或降权**出 top3（单测 golden）。
- [ ] `too_shallow` / `too_deep` 仅影响**该条/同主题**讲解深度，**不**修改全局默认 depth（全局 depth → KP-05）。
- [ ] feedback 路径 **不** create KnowledgeNode。
- [ ] feedback **不**直接写 user profile 永久字段（KP-05 负责 correction 优先）。
- [ ] KOS-B3 feedback 会话测试仍绿或扩展为持久化版。

## 不变量与权限边界

- feedback 属于 WorldItem/ranking 层，非永久知识；`too_shallow`/`too_deep` 为 item/主题级，非全局 profile 默认。
- 入库仍仅用户语音确认。
- MemoryProvider 不写图谱/画像。

## 测试 / 验证命令

```bash
pnpm test -- briefingStore briefingFeedbackRepo scoreWorldItems feedbackReplay
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 反馈只改 UI 不改下次 rank | 必须第二次 top3 变化单测 |
| 与 profile 冲突 | KP-05 明确 correction 覆盖蒸馏 |

**Stop condition：** 用户反馈 **只能** 影响单次 UI，不能影响下一轮排序 → **不继续**更复杂成长伴侣能力（KP-05+ 阻塞）。

## Skill 使用要求

- **仅 store/storage：** 不需要 design-review。
- **若改 feedback 入口/伴侣卡片 UI：** `design-review` + `qa`。

---

## Harness 验收协议

### Scope

- **做：** feedback 持久化、rerank、elaboration depth hook。
- **不做：** profile 面板、Weekly Review、Project 节点。

### Input fixtures

- KOS-B2 ranking golden + B3 feedback kinds
- 同一 WorldItem id 连续两轮 launch

### User actions

1. 对 top1 标记 `not_interested`。
2. 触发 rerank（重启或 harness rerank）。
3. 断言 top1 id 变化。

### Expected observations

| 观测 | 期望 |
|------|------|
| 持久化 | 重启后 feedback 仍在 |
| rerank | top3 组成变化 |

### Assertions

```text
Given feedback not_interested on item X
When scoreWorldItems runs again
Then X not in top3 (or score below threshold)
And no KnowledgeNode created from feedback
And feedback persisted across reload
When too_shallow or too_deep on item X
Then elaboration depth changes for X and same-topic items only
And global default teaching depth unchanged (KP-05 owns global)
```

### Forbidden behaviors

- `too_shallow`/`too_deep` 直接修改全局默认讲解深度或 profile 永久字段。
- feedback 静默写入 graph/profile 永久层。
- 反馈按钮触发 ingest create。
- 持久化失败却 UI 显示「已记住」。

### Failure recovery

| 失败 | 行为 |
|------|------|
| DB 写失败 | 会话内权重仍生效 + 用户可见「未保存」 |
| rerank 空 | 空态 briefing，不 error |

### Verification command

```bash
pnpm test -- briefingFeedbackRepo feedbackReplay scoreWorldItems
pnpm check
```
