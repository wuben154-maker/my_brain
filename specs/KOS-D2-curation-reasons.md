# KOS-D2 — Curation Reasons 整理理由与边迁移（`curation-reasons`）

- **阶段：** KOS-D · **状态：** ✅ 已实现
- **上游：** KOS-A3、KOS-A1 · **下游：** KOS-D3、KOS-E1
- **复用：** V4 `autoCurate`、`graphHistoryStore`、`CurationReasonCode`、A3 overlay
- **依赖 / 前置里程碑：** **KOS-A3**（history/undo）；**KOS-A1** golden reason
- **可并行性：** 与 D1 并行；**D3 依赖本 spec reason 完整性**

> **定位：** 规范化 **merge / link / archive** 的 **reasonCode**、中文 **reasonDetail**、**边迁移** 记录；扩展 A3 单 link golden 到 **多 mutation 类型** fixture eval。**Archive 非 hard-delete**；merge 后 **边迁移可 undo 恢复**。

## 1. 目标

1. 扩展 **`CurationReasonCode`** 枚举（覆盖 merge、archive、link、edge_migrate）。
2. **`GraphHistoryEntry`** 必含：`affectedNodeIds`、`affectedEdgeIds`、`edgeMigrations[]`（from→to）。
3. 提供 **`CURATION_FIXTURE_GRAPH`** + **`CURATION_MUTATION_GOLDEN[]`**（3 条：link、merge、archive 各 1）。
4. 扩展 A3 UI：展示 edge migration 摘要（「3 条边从 A 迁到 B」）。
5. Undo 单测：merge 场景 **边集合 === before**。

## 2. 非目标

- 不改自动整理为「先建议后确认」（仍 post-ingest auto apply）。
- 不做 Weekly Review 自然语言（D3）。
- 不新增 provenance 字段（D1）。
- 不实现 redo。
- 不让用户审批整理（v2 已自动）。

## 3. 契约 / 涉及文件

```
src/domain/graphHistory.ts                 # 扩展：reason codes、edgeMigrations
src/agent/curation/autoCurate.ts           # 扩展：输出完整 meta（测试模式）
src/agent/curation/curationReason.ts       # 扩展：code → 中文 detail 模板
src/lib/graphMutations.ts                  # 扩展：merge 边迁移记录
src/showcase/curationFixtureGraph.ts       # 新增：CURATION_FIXTURE_GRAPH
src/components/curation/CurationReportOverlay.tsx  # 扩展：migration 行
```

### 3.1 ReasonCode 扩展

| code | kind | reasonDetail 模板（中文） |
|---|---|---|
| `ingest_link` | link | A3 已有 golden |
| `duplicate_merge` | merge | `与 {target} 含义重复，已合并并迁移关联边。` |
| `stale_archive` | archive | `{node} 已被新概念替代，已归档隐藏。` |
| `edge_migrate` | meta | `合并后 {n} 条关系已迁移到 {target}。` |

### 3.2 CURATION_MUTATION_GOLDEN（fixture 图）

**Graph：** A1 snapshot + 额外重复节点 `demo-rag-dup`（intro 与 demo-rag 相似）

| # | kind | reasonCode | undo 断言 |
|---|---|---|---|
| 1 | link | `ingest_link` | 边消失 |
| 2 | merge | `duplicate_merge` | dup 节点再现；边数恢复 |
| 3 | archive | `stale_archive` | archived=false |

**边迁移 golden：** merge `demo-rag-dup` → `demo-rag` 时，`demo-agent → demo-rag-dup` 变为 `demo-agent → demo-rag`。

## 4. 数据结构 / store

| 字段 | 说明 |
|---|---|
| `GraphHistoryEntry.edgeMigrations` | `{ edgeId, fromNodeId, toNodeId }[]` |
| `GraphHistoryEntry.reasonCode` | 必填，非空 |
| `GraphHistoryEntry.reasonDetail` | 必填（showcase/test 模式） |

## 5. 验收清单

- [ ] 三种 mutation 均产生 history entry + reason。
- [ ] Archive 节点 `loadGraph` 可恢复；无 SQL DELETE。
- [ ] Merge undo 后边迁移 reversible（golden 边集）。
- [ ] A3 overlay 展示 migration 计数。
- [ ] Showcase 仍仅 1 link golden（A 不回归）；扩展 golden 在独立 fixture 测。
- [ ] MCP 无 merge/archive write 工具。

## 6. 涉及不变量

- **整理可自动、可解释、可撤销**（愿景 + V4）。
- **删除 = 归档**。
- **边随节点迁移**（AGENTS #4）。
- **新建仍用户确认**；curation 仅 post-ingest。

## 7. 测试（harness）

- `curationReason.test.ts`：模板渲染。
- `curationMutationGolden.test.ts`：三种 mutation + undo。
- `edgeMigration.test.ts`：merge 边集 before/after。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 破坏 A3 showcase | showcase 模式仍禁用 merge/archive |
| 快照 undo 体积 | 接受；H5 顺延 |

## 9. DoD

- `pnpm check` 全绿；curation golden + undo 绿。
- D3 可聚合 `reasonCode` 统计。

---

## Harness（验收协议）

### Scope

- **做：** reason 扩展、edge migration 记录、三类型 golden、undo、UI 摘要。
- **不做：** weekly 文案、provenance、interview。

### Input fixtures

- `CURATION_FIXTURE_GRAPH`
- `CURATION_MUTATION_GOLDEN`
- A3 overlay hooks

### User actions

1. Harness 依次 apply 三种 auto-curate mutations（测试模式）。
2. 对每条 entry undo。

### Expected observations

- 3 history entries；reasonDetail 非空。
- merge 后 dup 不可见；undo 后可见。

### Assertions

```text
Given CURATION_FIXTURE_GRAPH
When apply golden mutations in order
Then graphHistoryStore.entries.length === 3
And merge entry.edgeMigrations.length >= 1
When undo each entry
Then graph equals cumulative before snapshots
And no DELETE FROM nodes
```

### Forbidden behaviors

- auto apply 无 history entry。
- Archive hard-delete。
- Merge 丢失边（undo 无法恢复）。
- 空 reasonDetail（test/showcase 模式）。

### Failure recovery

| 失败 | 行为 |
|---|---|
| merge 冲突 | skip mutation + warn entry |
| undo 失败 | toast；图保持 + 日志 |

### Verification commands

```bash
pnpm test -- curationReason curationMutationGolden edgeMigration
pnpm check
```

### Out-of-scope

- Weekly Brain Review（D3）。
- User 审批整理 UI。
- Live LLM 生成 reasonDetail。
