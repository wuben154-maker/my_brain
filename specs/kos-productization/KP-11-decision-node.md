# KP-11 — Decision 节点（`decision-node`）

- **阶段：** KP Phase 6.2 · **状态：** planned
- **上游：** KP-10 · **下游：** KP-12
- **依赖 / 前置里程碑：** KP-10 Source PASS；**节点类型迁移框架由 KP-07 交付**
- **可并行性：** 不可并行；须 KP-10 完成

## 定位

引入 **`Decision`** 节点，记录项目关键取舍。Phase 6 第二种类型；每次只扩一种。

## 目标

1. `Decision` schema：title、rationale、alternativesConsidered、sourceRefs、updatedAt、linked Project/Concept。
2. migration + export + MCP read shape。
3. 进入条件：用户确认创建或明确 harness fixture；无 AI 静默 Decision。
4. UI 轻量标记；星图过滤默认不突出 Decision 噪声。
5. 关系受控：优先 `relates_to` / `decided_for` 等最小集，不无限增 relation enum。
6. undo/history/auto-curate 回归。

## 非目标

- 不重复 Source/Project（KP-08/10）。
- 不做 Question/Skill（KP-12/13）。
- 不做 decision 自动执行（KP-15 action 层）。

## 涉及文件/模块

```
src/domain/nodes/decisionNode.ts            # 新建
src/storage/schemaMigrations.ts             # Decision 类型迁移（机制由 KP-07 交付）
src/components/brain/BrainGraphView.tsx
src/lib/graphVisualTokens.ts
src/export/exportGraphJson.ts
src/export/exportGraphMarkdown.ts
src/domain/graph.decision.test.ts           # 新建（与 graph.ts 同目录）
```

## 用户可见流程或数据流

```
用户语音/ UI 确认「记录决策：选 A 不选 B」
  → Decision 节点创建
  → 连到 Project/Concept
  → Weekly Review 可引用（读-only）
  → export/MCP 可读
```

## 验收清单

- [ ] Decision 单独 migration test 绿。
- [ ] Concept+Project+Source graph 迁移兼容。
- [ ] 用户确认门控；无 silent create。
- [ ] export round-trip；MCP read-only。
- [ ] undo 对 Decision create/link 有效。
- [ ] 星图默认视图可控。
- [ ] spec-acceptance-review PASS。

## 不变量与权限边界

- Decision 创建 = 用户确认入库类操作（非 auto-curate 静默新建 Decision，除非产品显式规则且须 undo）。
- archive 不 hard-delete。
- MCP 只读。

## 测试 / 验证命令

```bash
pnpm test -- graph.decision exportGraphJson importGraphJson decisionIngestGate
pnpm check
```

## 风险与 Stop condition

**Stop condition：** 同 Phase 6 通用——UI 噪声、迁移不可逆、导出不稳定、写入边界不清 → 停止 KP-12。

## Skill 使用要求

- 用户可见入口 → `design-review` + `qa`。

---

## Harness 验收协议

### Scope

- **做：** Decision 类型单独落地。
- **不做：** Question/Skill、provisional、external action。

### Input fixtures

- Graph with Concept+Project+Source
- Decision ingest golden

### User actions

1. 用户确认创建 Decision harness。
2. link to Project → undo。

### Expected observations

Decision 可见、可 export、可 undo。

### Assertions

```text
When Decision added after Source PASS
Then migrate + export + undo pass
And no silent Decision create
```

### Forbidden behaviors

- 与 Source 同 PR 批量 schema。
- Decision 触发外部 action execute。

### Failure recovery

Migration 失败 → rollback snapshot。

### Verification command

```bash
pnpm test -- graph.decision exportGraphJson importGraphJson
pnpm check
```
