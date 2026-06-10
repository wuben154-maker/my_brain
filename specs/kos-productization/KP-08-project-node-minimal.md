# KP-08 — Project 节点最小落库（`project-node-minimal`）

- **阶段：** KP Phase 5 · **状态：** planned
- **上游：** KP-07、KOS-E2 · **下游：** KP-09、KP-10+
- **依赖 / 前置里程碑：** **KP-07 PASS**（含 schema versioning + 迁移框架）；默认 Radar 能解释「与我有关」
- **可并行性：** 无；**Phase 6 不重复 Project**

> **`Project` 在本 spec 一次性最小落地；KP-10–13 只做 Source/Decision/Question/Skill。**

## 定位

在 Radar + Weekly Review 主闭环跑通、H5-storage-transactions gate 通过后，用 **最小** `Project` 节点证明「外部趋势与 my_brain 项目有何关系」。**仅此一种新类型**，不预扩 Decision/Question/Skill。

## 目标

1. `src/domain/graph.ts` 最小扩展：支持 `Concept` + **`Project`**。
2. Project 字段：`title`、`intro`、`sourceRefs`、`updatedAt`（+ 迁移）。
3. 外部信息经 `used_in` 或等价关系连到 Project。
4. Project Suggestions（KOS-E2）引用 **真实** Project 节点，非 mock 文案。
5. UI 仍简洁星图；不做复杂 dashboard。
6. 不破坏 ingest gate、auto-curate、history/undo、export；MCP 仍只读。

## 非目标

- **不**在本 spec 引入 Source/Decision/Question/Skill（KP-10–13）。
- 不做 provisional ingest（KP-14）。
- 不做 action 执行（KP-15）。
- 不做多 Project dashboard 管理页。

## 涉及文件/模块

```
src/domain/graph.ts
src/domain/nodes/projectNode.ts
src/storage/schemaMigrations.ts             # Project 类型迁移（机制由 KP-07 交付）
src/components/brain/BrainGraphView.tsx     # 轻量 Project 视觉区分
src/cognitive/generateProjectSuggestions.ts # KOS-E2
src/actions/runGenerateProjectSuggestions.ts
src/export/exportGraphJson.ts
src/export/exportGraphMarkdown.ts
src/domain/graph.project.test.ts          # 新建：Project 类型 migration（与 graph.ts 同目录）
src/mcp/brainMcpForbidden.test.ts         # MCP 只读边界（现有）
src/export/importGraphJson.roundtrip.test.ts # export round-trip（现有）
```

## 用户可见流程或数据流

```
Radar 信号含 project 相关度 → 用户入库概念
  → auto-curate 可能 link/attach 到 Project
  → Project Suggestions 草稿引用图谱中 Project 节点
  → 星图可见 Project 节点（轻量样式）
  → export/MCP 可读 Project shape
```

## 验收清单

- [ ] Project 节点 CRUD 经 **用户确认入库** 或明确 migration 路径；无 AI 静默 create Project。
- [ ] 字段 title/intro/sourceRefs/updatedAt 齐全；export round-trip 绿。
- [ ] `used_in`（或等价）可连 WorldItem/Concept → Project。
- [ ] KOS-E2 suggestions 引用真实 node id。
- [ ] ingest、auto-curate、undo、export 回归绿。
- [ ] MCP 只读边界测试绿；无 write tools。
- [ ] schema migration 可回滚或 forward-only 有测试。
- [ ] **KP-10 不包含 Project**（文档与代码注释明确）。

## 不变量与权限边界

- 新建 Project **仍**经用户确认入库出口（或 harness migration fixture）。
- auto-curate 可 link/merge **已有**节点，不静默新建 Project。
- Delete = archive；边 migrate 规则适用 Project。
- Brain MCP 只读。

## 测试 / 验证命令

```bash
pnpm test -- graph.project exportGraphJson importGraphJson generateProjectSuggestions brainMcpForbidden
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| KP-07 未 PASS 就扩 schema | CI gate 引用 KP-07 tests |
| 星图 UI 噪声 | 轻量样式 + 过滤默认仍 Concept-heavy |
| 与 Phase 6 重复 | README 声明 Project done in KP-08 |

**Stop condition：** 默认 Radar 不能解释「为何与我有关」**或** KP-07 未 PASS → 不做 Project 扩展。

## Skill 使用要求

- **若改星图 Project 视觉：** `/plan-design-review`。
- **落地后（必须）：** `design-review` + `qa`。

---

## Harness 验收协议

### Scope

- **做：** Project 类型、迁移、export、MCP、suggestions 引用、undo 回归。
- **不做：** Source/Decision/Question/Skill、provisional、action execute。

### Input fixtures

- Concept-only graph → migration → add Project
- KOS-E2 project suggestions golden

### User actions

1. migration harness：Concept graph → 含 Project。
2. ingest + link to Project + undo。
3. export JSON/Markdown；MCP read Project。

### Expected observations

| 观测 | 期望 |
|------|------|
| 星图 | Project 可区分但不乱 |
| export | Project fields round-trip |
| MCP | read ok, write forbidden |

### Assertions

```text
Given KP-07 storage gate PASS
When Project node created via user-confirmed ingest
Then graph history records change
And undo restores pre-Project state
And export includes Project type
And MCP cannot write Project
And Phase 6 specs do not re-add Project type
```

### Forbidden behaviors

- AI 静默 create Project。
- KP-07 未 PASS 合并 KP-08。
- Phase 6 再次定义 Project schema。

### Failure recovery

| 失败 | 行为 |
|------|------|
| migration 失败 | 不 mutate live graph；保留 backup |
| export 缺 Project | 阻塞 release |

### Verification command

```bash
pnpm test -- graph.project exportGraphJson importGraphJson generateProjectSuggestions brainMcpForbidden
pnpm check
```
