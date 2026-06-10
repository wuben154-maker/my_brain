# KP-07 — Storage Transaction Gate（`storage-transaction-gate`）

- **阶段：** KP Phase 4.5 · **状态：** planned
- **上游：** H5-storage-transactions 债务（原 specs/README 债务表 H2-storage 项） · **下游：** KP-08、KP-09
- **依赖 / 前置里程碑：** 理解 `applyGraphMutation` + `persistGraphSnapshot` 分步债务；**可与 KP-06 并行启动**（KP-09 验收需 KP-06 文档口径一致）
- **可并行性：** 可与 KP-06 并行启动；**阻塞 KP-08 及一切 schema 扩展**

> **Phase 5 的前置 gate。** schema expansion 前必须 PASS，否则禁止 Project 节点扩展。

## 定位

解决 **H5-storage-transactions** 债务（原 specs/README 债务表 H2-storage 项）：graph mutation 与 history persist 不得出现 **半写** 窗口。Phase 5 起扩 schema 时，若 transaction 未收敛，undo/export/migrate 不可信。

## 目标

1. 审计 graph write + history persist 原子性或 **可验证恢复**路径。
2. 补齐 storage layer transaction / rollback / recovery。
3. 明确哪些 mutation **必须**同事务提交 graph + history。
4. ingest、auto-curate、undo 路径在修复后 **回归全绿**。
5. 登记 specs/README 债务项处置（H5-storage-transactions → resolved）。
6. **定义 graph schema versioning + 节点类型迁移框架**（forward / rollback），供 KP-08、KP-10–13 复用（基于现有 `migrations.ts` / `schemaMigrations.ts` + snapshot 持久化现状）。

## 非目标

- 不引入新节点类型（KP-08）。
- 不做 UI 改动。
- 不做 cloud sync。
- 不重构整个 storage 为 ORM。

## 涉及文件/模块

```
src/lib/graphMutations.ts
src/storage/graphRepository.ts           # 或等价 persist 层
src/storage/migrations.ts                # 现有迁移入口
src/storage/schemaMigrations.ts          # graph schema versioning + 节点类型迁移框架
src/storage/transaction.ts               # 新增/扩展
src/stores/graphHistoryStore.ts
src/stores/proposalStore.ts              # 调用链审计
src/agent/curation/autoCurate.ts
src/lib/runAutoCuratePipeline.ts
```

## 用户可见流程或数据流

```
用户确认入库 → graph + history 同事务（或可 recovery）
  → auto-curate merge → graph + history 一致
  → undo → 回滚 graph 与 history 对齐
  → 失败注入：可检测半写 → 重试/rollback，不 silent corrupt
```

## 验收清单

- [ ] 无「图谱已变但 history 未记」可稳定复现的半写窗口（测试覆盖）。
- [ ] 无「history 已记但 graph 回滚失败」不可恢复状态。
- [ ] undo round-trip 在失败注入下仍可靠。
- [ ] ingest + auto-curate + undo integration 回归绿。
- [ ] 文档/comment 列出 must-co-transact mutations。
- [ ] `pnpm check` scoped 通过。
- [ ] **graph schema versioning + 节点类型迁移框架**已定义（forward / rollback），KP-08、KP-10–13 可复用。
- [ ] **KP-08 启动条件：** 本 spec acceptance PASS。

## 不变量与权限边界

- undo 依赖一致 snapshot；transaction 不得破坏 V4 变更历史语义。
- 用户确认 create 门控不变。
- MCP 仍只读。

## 测试 / 验证命令

```bash
pnpm test -- graphMutations storageTransaction undoRoundTrip failureInjection
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 仅快照兜底无事务 | integration 失败注入 |
| 性能回退 | scoped transaction，非全表锁 |

**Stop condition：** transaction 债务 **未验收 PASS → 不进入 KP-08（Project）及 Phase 6 schema 扩展。**

## Skill 使用要求

- **不需要** design-review；storage/integration tests + `spec-acceptance-review`。

---

## Harness 验收协议

### Scope

- **做：** graph+history 原子性/可恢复性、undo 可靠性、ingest/curation 回归、graph schema versioning + 节点类型迁移框架（forward/rollback）。
- **不做：** Project schema、UI、evals 文案。

### Input fixtures

- Graph with nodes; harness merge + undo sequence
- Failure injection: persistGraphSnapshot throws mid-flight

### User actions

1. 跑 ingest → auto-curate → undo integration。
2. 注入 persist 失败 → 断言 detectable 状态 + recovery。

### Expected observations

| 观测 | 期望 |
|------|------|
| happy path | graph 与 history 一致 |
| failure | 无 silent half-write；recover 或 rollback |

### Assertions

```text
Given applyGraphMutation + persistGraphSnapshot
When persist fails after graph write
Then system detects inconsistency OR rolls back atomically
And undo restores prior graph matching history snapshot
```

### Forbidden behaviors

- 半写状态下 undo 声称成功但 graph/history 不一致。
- 跳过测试直接扩 schema。
- transaction 修复破坏 MCP 只读（无关但回归必跑）。

### Failure recovery

| 失败 | 行为 |
|------|------|
| detect half-write | 阻塞 further mutations + user-visible error + retry |
| rollback 失败 | 从 last good snapshot restore |

### Verification command

```bash
pnpm test -- storageTransaction undoRoundTrip graphMutations failureInjection
pnpm check
```
