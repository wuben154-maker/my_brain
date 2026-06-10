# KP-13 — Skill 节点（`skill-node`）

- **阶段：** KP Phase 6.4 · **状态：** planned
- **上游：** KP-12 · **下游：** KP-14
- **依赖 / 前置里程碑：** KP-12 Question PASS；Phase 6 前四类型齐全；**节点类型迁移框架由 KP-07 交付**
- **可并行性：** 不可并行；Phase 6 最后一型

## 定位

引入 **`Skill`** 节点，记录能力成长与复习目标。完成 Phase 6 schema 扩展（**不含** KP-08 已完成的 Project）。

## 目标

1. `Skill` schema：name、proficiency、reviewCadence、sourceRefs、linked Concept/Project。
2. migration + export + MCP read。
3. 用户确认创建 Skill；无 silent create。
4. UI 轻量；星图默认不过度展示 Skill 节点。
5. Phase 6 完成后：`pnpm check` + `spec-acceptance-review` 汇总 Phase 6。
6. 全部新类型不 bypass ingest/auto-curate history/undo。

## 非目标

- 不做 spaced repetition 完整产品（可 harness）。
- 不做 provisional ingest（KP-14）。
- 不重复 Project/Source/Decision/Question。

## 涉及文件/模块

```
src/domain/nodes/skillNode.ts               # 新建
src/storage/schemaMigrations.ts             # Skill 类型迁移（机制由 KP-07 交付）
src/export/exportGraphJson.ts
src/export/exportGraphMarkdown.ts
src/domain/graph.skill.test.ts              # 新建（与 graph.ts 同目录）
src/domain/graph.phase6Complete.test.ts     # 新建：Phase 6 全类型共存回归
```

## 用户可见流程或数据流

```
用户确认记录技能目标
  → Skill 节点
  → 连 Concept（「Python 类型系统」）/ Project
  → Review 可列出 weak skills
  → export 含 Skill
```

## 验收清单

- [ ] Skill migration + export round-trip 绿。
- [ ] Concept+Project+Source+Decision+Question+Skill 共存 graph 测试绿。
- [ ] 用户确认门控；MCP 只读。
- [ ] undo 有效；星图噪声可控。
- [ ] **Phase 6 完成标记**：KP-10–13 均 PASS 才可 KP-14。
- [ ] 旧 Concept-only（+Project）graph 仍可迁移。

## 不变量与权限边界

- Skill 创建 = 用户确认。
- auto-curate 不静默新建 Skill。
- MCP 只读。

## 测试 / 验证命令

```bash
pnpm test -- graph.skill graph.phase6Complete exportGraphJson importGraphJson
pnpm check
```

## 风险与 Stop condition

**Stop condition：** Skill 导致 UI/迁移/导出失败 → 停止 KP-14，不进入 provisional。

## Skill 使用要求

- `design-review` + `qa`（用户可见 Skill 入口/过滤）。

---

## Harness 验收协议

### Scope

- **做：** Skill 类型 + Phase 6 全类型共存回归。
- **不做：** provisional、action execute。

### Input fixtures

- Full Phase 6 graph fixture
- Skill ingest golden

### User actions

Add Skill → export all types → MCP read → undo。

### Expected observations

Six node kinds coexist; export stable; star map usable。

### Assertions

```text
When Skill added as final Phase 6 type
Then all Phase 6 types migrate and export
And KP-08 Project not redefined
And gate to KP-14 requires Phase 6 complete
```

### Forbidden behaviors

- Redefine Project in Phase 6 PR。
- Skip KP-10–12 直接 Skill。

### Failure recovery

Phase 6 rollback plan documented per migration。

### Verification command

```bash
pnpm test -- graph.skill graph.phase6Complete exportGraphJson importGraphJson
pnpm check
```
