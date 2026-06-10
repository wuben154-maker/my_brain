# KP-10 — Source 节点（`source-node`）

- **阶段：** KP Phase 6.1 · **状态：** planned
- **上游：** KP-09 PASS · **下游：** KP-11
- **依赖 / 前置里程碑：** **KP-09 总 gate PASS**；KP-08 Project 已落地（本 spec 不重复 Project）；**节点类型迁移框架由 KP-07 交付**
- **可并行性：** **不可**与 KP-11–13 并行；Phase 6 每次只扩一种类型

## 定位

Phase 6 第一步：把来源从字段提升为 **`Source` 一等对象**，增强 provenance。在 Concept + Project 之上 **单独**引入 Source，不一次性扩齐 Decision/Question/Skill。

## 目标

1. 定义 `Source` 节点：进入条件、可见性、export shape、MCP read shape、归档规则。
2. migration：旧 Concept-only + Project graph 可 forward migrate Source。
3. 与 KOS-D1 provenance 对齐：`sourceRefs` 可指向 Source 节点。
4. UI 轻量区分（星图样式/过滤）；无 dashboard。
5. round-trip export + undo + auto-curate 回归。
6. **不绕过**用户确认入库与 history/undo。

## 非目标

- **不**重复 KP-08 Project。
- **不**在本 spec 做 Decision/Question/Skill。
- **不**做 provisional ingest（KP-14）。
- **不**无限扩展关系类型。

## 涉及文件/模块

```
src/domain/graph.ts
src/domain/nodes/sourceNode.ts              # 新建
src/storage/schemaMigrations.ts             # Source 类型迁移（机制由 KP-07 交付）
src/components/brain/BrainGraphView.tsx
src/lib/graphVisualTokens.ts                # 节点视觉区分 token
src/export/exportGraphJson.ts
src/export/exportGraphMarkdown.ts
src/domain/graph.source.test.ts             # 新建：Source migration（与 graph.ts 同目录）
src/mcp/brainMcpRead.integration.test.ts    # MCP read shape（现有）
src/export/importGraphJson.roundtrip.test.ts
```

## 用户可见流程或数据流

```
用户确认入库概念 + 来源信息
  → 可 promote/create Source 节点（用户确认门控）
  → Concept.sourceRefs 链接 Source
  → 星图轻量显示 Source
  → export/MCP 可读 Source
  → archive Source = 隐藏不真删
```

## 验收清单

- [ ] Source 类型单独 migration + rollback/forward test。
- [ ] 旧 graph（Concept+Project）迁移后 export round-trip 绿。
- [ ] MCP read Source；write 仍禁止。
- [ ] 新类型不绕过 ingest gate；无 AI 静默 create Source。
- [ ] auto-curate、undo 对 Source 操作进 history。
- [ ] 星图默认视图不因 Source 变乱（过滤/样式可控）。
- [ ] `spec-acceptance-review` PASS。

## 不变量与权限边界

- 新建 Source 经用户确认路径（与 Concept 同级门控）。
- Delete = archive。
- MCP 只读。
- Memory 不写图谱。

## 测试 / 验证命令

```bash
pnpm test -- graph.source exportGraphJson importGraphJson brainMcpRead autoCurate
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| UI 噪声 | 默认 filter 非 Source |
| 迁移不可逆 | migration test + backup |
| provenance 双轨 | 单一 Source 节点权威 |

**Stop condition：** Source 导致 UI 噪声、迁移不可逆、导出不稳定或写入边界不清 → **停止** KP-11–13。

## Skill 使用要求

- 有用户可见星图/过滤入口 → `design-review` + `qa`。
- 规划可选 `/plan-design-review` 若大幅改视觉。

---

## Harness 验收协议

### Scope

- **做：** Source 类型、迁移、export、MCP、UI 降噪、undo。
- **不做：** Decision/Question/Skill、provisional、action execute。

### Input fixtures

- Concept+Project graph snapshot
- KOS-D1 source golden

### User actions

1. migrate harness graph → add Source via confirmed ingest。
2. export → re-import round-trip。
3. MCP read Source；attempt write → fail。

### Expected observations

| 观测 | 期望 |
|------|------|
| 迁移 | 无 data loss |
| 星图 | 可区分但不乱 |
| MCP | read ok |

### Assertions

```text
Given KP-09 PASS
When Source type added alone
Then old graphs migrate and export round-trip
And no silent Source create
And undo works on Source mutations
```

### Forbidden behaviors

- 批量引入 Decision/Question/Skill 于本 PR。
- Source 直写 bypass ingest。
- MCP write Source。

### Failure recovery

| 失败 | 行为 |
|------|------|
| migration 失败 | abort；保留 pre-migration snapshot |

### Verification command

```bash
pnpm test -- graph.source exportGraphJson importGraphJson brainMcpRead
pnpm check
```
