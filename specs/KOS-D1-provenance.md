# KOS-D1 — Provenance 来源与节点元数据（`provenance`）

- **阶段：** KOS-D · **状态：** ✅ 已实现
- **上游：** KOS-A1、KOS-A2 · **下游：** KOS-D2、KOS-D3、KOS-E1、KOS-E3、KOS-F2
- **复用：** V3 ingest `sourceUrl`、graph node 模型、`ingestActions`
- **依赖 / 前置里程碑：** **KOS-A2**（ingest 带 source）；A1 graph 含 sourceUrl 示例
- **可并行性：** 与 D2 并行起草；**D3/E 依赖本 spec 字段**

> **定位：** 长期节点具备完整 **provenance**：`sourceRefs[]`、`updatedAt`、`intro` 规范；支持多来源与 WorldItem 溯源 id。**不扩展 UI 为文档库**（N2 superseded）。

## 1. 目标

1. 定义 **`SourceRef`**：`url`、`title`、`kind`、`worldItemId?`、`ingestedAt`。
2. 扩展 graph node（或 parallel map）存储 **`sourceRefs`** 与 **`updatedAt`**（ISO8601）。入库节点必须 `sourceRefs.length >= 1`；legacy/manual 节点允许显式空数组。
3. Ingest 路径：从 `BriefingItem` / `WorldItem` 自动附加首条 `SourceRef`。
4. 提供 **`PROVENANCE_GRAPH_GOLDEN`**：A1 graph + ingest 后 graphiti 节点 sourceRefs 快照。
5. 迁移策略：现有 `sourceUrl` → `sourceRefs[0]` 兼容读取。

## 2. 非目标

- 不实现 merge/archive reason UI（D2）。
- 不做 Weekly Review 文案（D3）。
- 不持久化全文/原文 HTML。
- 不新增 Source **图谱节点类型** UI（数据层可预留 `kind`，UI 仍 concept 星图）。
- 不改 ingest 门控。

## 3. 契约 / 涉及文件

```
src/domain/graph/sourceRef.ts              # 新增：SourceRef 类型
src/domain/graph/knowledgeNode.ts          # 扩展：sourceRefs, updatedAt
src/conversation/ingestActions.ts          # 扩展：写入 sourceRefs + worldItemId
src/lib/graphMutations.ts                  # 扩展：create/update 维护 updatedAt
src/storage/migrations/source_refs.sql     # 可选：JSON 列或规范化表
src/showcase/showcaseFixtures.ts           # 扩展：PROVENANCE_GRAPH_GOLDEN
```

### 3.1 节点最低字段（长期）

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | ✓ | 概念名 |
| `intro` | ✓ | 短简介，非新闻碎片 |
| `sourceRefs` | 条件必填 | ingest 节点 ≥1；legacy/manual 节点可为显式 `[]` |
| `updatedAt` | ✓ | 最后变更时间；fixture 冻结 |

### 3.2 PROVENANCE_GRAPH_GOLDEN

Post-showcase ingest `showcase-ingest-graphiti`：

```json
{
  "id": "showcase-ingest-graphiti",
  "sourceRefs": [{
    "url": "https://example.com/graphiti",
    "title": "Graphiti 时序知识图谱",
    "kind": "briefing",
    "worldItemId": "radar-wi-showcase-3",
    "ingestedAt": "2026-06-01T00:00:00.000Z"
  }],
  "updatedAt": "2026-06-01T00:00:00.000Z"
}
```

## 4. 数据结构 / store

| 层 | 变更 |
|---|---|
| SQLite `nodes` | `source_refs_json`、`updated_at` |
| `graphStore` | 读写兼容 legacy `sourceUrl` |

## 5. 验收清单

- [ ] 所有 A1 demo 节点可读 `updatedAt`（迁移默认 = createdAt 或冻结时间）。
- [ ] Ingest 后 graphiti 节点 sourceRefs golden 通过。
- [ ] 规则清晰：ingest-created 节点必须有 `sourceRefs.length >= 1`；legacy/manual 节点允许 `sourceRefs: []`，但不得缺字段。
- [ ] 手动 edit intro 触发 `updatedAt` 变化（单测 mock clock）。
- [ ] Round-trip serialize/deserialize 快照稳定。
- [ ] 不变量：provenance 写入不绕过 ingest（无静默 create）。

## 6. 涉及不变量

- **节点 = 概念 + 简介 + 来源**（AGENTS #4）。
- **WorldItem ≠ KnowledgeNode**；溯源 id 仅 ref，不复制 WorldItem 全文。
- **删除 = 归档**；archive 保留 sourceRefs。
- **本地优先**。

## 7. 测试（harness）

- `sourceRef.test.ts`：schema、legacy 迁移。
- `provenanceIngest.integration.test.ts`：A2 ingest → golden。
- `graphSerialize.provenance.test.ts`：round-trip。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| schema 破坏 A1 快照 | 兼容层 + 迁移单测 |
| 多 source 过度设计 | 首版 ingest 仅 1 条；手动 append 顺延 |

## 9. DoD

- `pnpm check` 全绿；provenance golden 绿。
- D2/D3/E3/F2 可引用 `sourceRefs`。

---

## Harness（验收协议）

### Scope

- **做：** SourceRef、updatedAt、ingest 附加、迁移、golden。
- **不做：** curation reason、weekly review、export UI。

### Input fixtures

- A1 graph + ingest path
- `PROVENANCE_GRAPH_GOLDEN`

### User actions

1. 跑 A2 ingest graphiti。
2. Harness 读取 node `showcase-ingest-graphiti`。

### Expected observations

- `sourceRefs.length >= 1`；url 与 A1 brief 一致。
- `updatedAt` 等于冻结时间。

### Assertions

```text
Given showcase ingest success
When load node showcase-ingest-graphiti
Then sourceRefs matches PROVENANCE_GRAPH_GOLDEN
And intro !== news title alone
And no node without user ingest has worldItemId-only ref newly attached silently
```

### Forbidden behaviors

- 静默给未 ingest 节点追加 sourceRefs。
- 存储 article 全文。
- Provenance 写入代替 ingest create。

### Failure recovery

| 失败 | 行为 |
|---|---|
| 迁移失败 | 启动 warn；回退 sourceUrl 只读 |
| 无效 url | ingest 仍成功；sourceRef.url null + kind=manual |

### Verification commands

```bash
pnpm test -- sourceRef provenanceIngest graphSerialize.provenance
pnpm check
```

### Out-of-scope

- Source 节点 UI（N2）。
- Curation reason codes（D2）。
- Markdown export（F2）。
