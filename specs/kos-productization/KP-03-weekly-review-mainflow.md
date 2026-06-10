# KP-03 — Weekly Review 主路径（`weekly-review-mainflow`）

- **阶段：** KP Phase 3 · **状态：** planned
- **上游：** KP-00、KOS-D3、V4 · **下游：** KP-09、KP-08（价值证明）
- **依赖 / 前置里程碑：** KP-00 UI contract；KOS-D3 weekly-brain-review harness
- **可并行性：** 可与 KP-04 并行（KP-03 依赖 KP-00；KP-04 依赖 KP-01）；**内容依赖 graph history 有真实变更**

## 定位

把 Weekly Review 从 **设置子页** 提升为入库/整理后的 **自然后续入口**；Review 绑定真实 `graphHistoryStore`，证明图谱能反哺认知价值。Action 建议保持 **draft-only**。

**时间窗口：** Review 聚合范围 = 自上次 review 以来的 graph history（默认上限 7 天）。

**两种产物（须区分）：**
- **整理报告 / Review 入口提示**：入库或 auto-curate 后的即时 CTA（例如刚入库 1 个节点时弹出的是整理报告或 Review 入口，**不是**完整 Weekly 正文）。
- **Weekly Review 正文**：按上述时间窗口聚合 graph history 生成的周度摘要。

## 目标

1. `WeeklyReviewOverlay` 挂载 KP-00 companion shell；主路径可发现（非仅 Settings）。
2. `buildWeeklyBrainReview` 引用真实 GraphChange：新增、连线、合并、归档、薄弱点。
3. 空 history **不编造**；模板化摘要无 graph 引用则 FAIL。
4. DEMO 增加「入库 → auto-curate → Weekly Review」复现步骤。
5. 定义 Review 时间窗口 = 自上次 review 以来的 graph history（默认上限 7 天）；区分「整理报告/Review 入口 CTA」与「Weekly Review 正文」。
6. CognitiveAction 输出仍 draft-only，无自动外部执行。

## 非目标

- 不引入 Project/Source 等新节点类型（KP-08/10+）。
- 不做 controlled action 执行（KP-15）。
- 不重写 graph history 存储（KP-07 修 transaction，本 spec 消费 history）。
- 不做 profile feedback 闭环（KP-04/05）。

## 涉及文件/模块

```
src/components/review/WeeklyReviewOverlay.tsx
src/cognitive/buildWeeklyBrainReview.ts
src/stores/graphHistoryStore.ts
src/components/companion/CompanionShell.tsx
src/conversation/ConversationConductor.ts    # 整理后 prompt Review 入口
docs/DEMO.md                                 # 主路径复现步骤
```

## 用户可见流程或数据流

```
用户语音确认入库 → auto-curate → graph history 写入
  → companion 提示 Weekly Review（或 overlay 入口可见）
  → Review 展示本周 GraphChange 摘要 + 薄弱点
  → Action drafts（draft-only）可选展示
  → 关闭回到星图+光球
```

## 验收清单

- [ ] 主路径（非 Settings 唯一）可打开 Weekly Review overlay。
- [ ] Review 段落 **引用真实** graph history id/op（新增/merge/archive/link）。
- [ ] 空 history 显示诚实空态，**不**凭空生成 fake 节点名。
- [ ] Action 建议无「一键执行外部写」；draft-only 边界测试绿。
- [ ] ingest + curation 后 harness 可触发 **整理报告/Review 入口 CTA**（非完整 Weekly 正文冒充）。
- [ ] **Weekly Review 正文**按时间窗口（自上次 review，默认 ≤7 天）聚合 graph history；刚入库 1 节点时展示的是入口提示，正文仍按窗口聚合。
- [ ] KP-00 companion shell 关闭/返回语义一致。
- [ ] KOS-D3 golden tests 仍绿。

## 不变量与权限边界

- Review 不写图谱；只读 history + 产出 draft actions。
- 新建节点仍仅用户确认入库。
- Brain MCP 只读。
- MemoryProvider 不写图谱/画像。

## 测试 / 验证命令

```bash
pnpm test -- buildWeeklyBrainReview weeklyReview golden graphHistoryCitation
pnpm test -- weeklyReviewMainflow draftOnlyBoundary
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| Review 仍只在 Settings | 主路径 CTA + e2e 断言 |
| 模板摘要无 citation | golden 必须含 change id |
| 与 Action 执行混淆 | draft-only UI 标签 + 测试 |

**Stop condition：** Review 只是模板化摘要、**无真实 graph 引用** → 不进入 Project 扩展（KP-08）或 Phase 6 schema。

## Skill 使用要求

- **规划期（必须）：** `/plan-design-review`。
- **落地后（必须）：** `design-review` + `qa`。

---

## Harness 验收协议

### Scope

- **做：** 主路径入口、graph history citation、空 history、draft-only actions。
- **不做：** Project 节点、provisional ingest、action 执行。

### Input fixtures

- KOS-D3 weekly review golden
- Harness：ingest 1 节点 + auto-curate 1 merge → history 有记录

### User actions

1. 跑 ingest → auto-curate harness。
2. 从主路径（非 Settings-only）打开 Weekly Review。
3. 对照 history 中 merge/create 是否在 Review 文案/列表中出现。

### Expected observations

| 观测 | 期望 |
|------|------|
| 有 history | Review 列出真实 change |
| 无 history | 空态，无 fake 节点 |
| actions | 标记 draft，无 execute 外部写 |

### Assertions

```text
Given graph history with merge op M1
When Weekly Review builds
Then review cites M1 or equivalent change ref
And no permanent graph write from review UI
When history empty
Then no fabricated node names
When user just ingested 1 node
Then show curation report or Review entry CTA only (not full Weekly body)
When Weekly Review body builds
Then aggregates graph history since last review (default max 7 days)
```

### Forbidden behaviors

- Review 仅 Settings 入口且无主路径 CTA。
- Review 静默 create/merge/archive。
- Action 默认执行 GitHub/issue/发文。

### Failure recovery

| 失败 | 行为 |
|------|------|
| history 读失败 | 错误态 + 重试；不展示 fake 摘要 |
| overlay 崩溃 | 降级 Settings 内只读 view + 日志（临时，须修主路径） |

### Verification command

```bash
pnpm test -- buildWeeklyBrainReview weeklyReviewMainflow draftOnlyBoundary
pnpm check
```
