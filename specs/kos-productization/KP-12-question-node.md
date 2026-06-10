# KP-12 — Question 节点（`question-node`）

- **阶段：** KP Phase 6.3 · **状态：** planned
- **上游：** KP-11 · **下游：** KP-13
- **依赖 / 前置里程碑：** KP-11 Decision PASS；**节点类型迁移框架由 KP-07 交付**
- **可并行性：** 不可并行

## 定位

引入 **`Question`** 节点，记录反复追问和学习盲点。Phase 6 第三种类型。

## 目标

1. `Question` schema：prompt、context、status（open/answered/archived）、sourceRefs、linked nodes。
2. migration + export + MCP read。
3. 用户确认创建；Learning trace（KOS-C1）可 **引用** Question id，但不替代 ingest 门控。
4. UI 轻量；过滤 open questions 可选。
5. undo/history 回归。

## 非目标

- 不重复 Source/Decision/Project。
- Skill 节点（KP-13）。
- 自动从 AI 对话批量生成 Question 进永久图谱（属 KP-14 隔离区讨论）。

## 涉及文件/模块

```
src/domain/nodes/questionNode.ts            # 新建
src/storage/schemaMigrations.ts             # Question 类型迁移（机制由 KP-07 交付）
src/cognitive/learningTrace.ts              # 可选引用
src/export/exportGraphJson.ts
src/export/exportGraphMarkdown.ts
src/domain/graph.question.test.ts           # 新建（与 graph.ts 同目录）
```

## 用户可见流程或数据流

```
用户确认「把这个问题记下来」
  → Question 节点
  → 关联 Concept/Project
  → Review/Interview 模式可读
  → answered 后仍 archive 不删
```

## 验收清单

- [ ] Question 单独 migration + export round-trip。
- [ ] 用户确认门控；无 AI 静默 Question 进永久图谱。
- [ ] MCP read-only；undo 有效。
- [ ] 星图噪声可控。
- [ ] KOS-C1 若引用 Question，仅 read 关联，不写图谱 bypass。

## 不变量与权限边界

- Question 永久层创建 = 用户确认。
- C1 learning trace 不写图谱（不变量 8）。
- MCP 只读。

## 测试 / 验证命令

```bash
pnpm test -- graph.question exportGraphJson importGraphJson questionIngestGate learningTrace
pnpm check
```

## 风险与 Stop condition

**Stop condition：** Phase 6 通用 stop → 不进入 KP-13。

## Skill 使用要求

- 用户可见入口 → `design-review` + `qa`。

---

## Harness 验收协议

### Scope

- **做：** Question 类型单独落地。
- **不做：** Skill、provisional bulk AI questions。

### Input fixtures

- Prior Phase 6 graph
- Question ingest golden

### User actions

Create Question via confirm → link → undo。

### Expected observations

Question exportable; not in graph from AI alone。

### Assertions

```text
When Question type added
Then migrate export undo pass
And learning trace does not silently create Question nodes
```

### Forbidden behaviors

- AI 批量写 Question 到 permanent graph。
- 与 Skill 同 PR。

### Failure recovery

Migration abort + snapshot restore。

### Verification command

```bash
pnpm test -- graph.question exportGraphJson importGraphJson learningTrace
pnpm check
```
