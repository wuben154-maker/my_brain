# KOS-F2 — Export Format 导出格式（`export-format`）

- **阶段：** KOS-F · **状态：** ✅ 已实现
- **上游：** KOS-D1、KOS-A1、KOS-E3 · **下游：** —
- **复用：** graph serialize、D1 `sourceRefs`、E3 blog draft markdown
- **依赖 / 前置里程碑：** **KOS-D1**（sourceRefs 导出）；**KOS-A1** graph fixture
- **可并行性：** 与 F1/F3 并行

> **定位：** 提供 **Markdown**、**JSON graph snapshot** 两种导出（首版至少各 1 种 schema + round-trip test），供其他工具/agent 读取本地认知底座。**不导出**原始音频/全文/WorldItem 池（可选 metadata 摘要）。

## 1. 目标

1. **`exportGraphMarkdown(graph, options)`** → 确定性 markdown（节点按 title 排序）。
2. **`exportGraphJson(graph, options)`** → versioned JSON schema `my-brain-graph/1.0`。
3. **`importGraphJson(json)`** → graph（**仅 harness / 显式用户导入**；非 MCP 默认路径）。
4. **`EXPORT_MARKDOWN_GOLDEN`** / **`EXPORT_JSON_GOLDEN`** 快照（A1 graph）。
5. CLI 或 dev 命令：`pnpm export:graph --format=md|json --out=tmp/`（mock 可跑）。

## 2. 非目标

- 不实现云同步/自动上传。
- 不 export 用户 profile 全量（可顺延 redacted snippet）。
- 不 export cognitive action drafts 为默认 bundle（可选 `--include-drafts` 顺延）。
- 不替代 MCP live query（F1）。
- Import 不自动 merge 到生产 DB（须 explicit UI confirm，本 spec harness 仅 round-trip 内存）。

## 3. 契约 / 涉及文件

```
src/export/exportGraphMarkdown.ts
src/export/exportGraphJson.ts
src/export/importGraphJson.ts
src/export/graphExportSchema.ts        # JSON schema 常量
src/export/exportGolden.ts             # golden snapshots
scripts/export-graph.mjs               # 可选 CLI
```

### 3.1 JSON Schema `my-brain-graph/1.0`

```json
{
  "schemaVersion": "my-brain-graph/1.0",
  "exportedAt": "2026-06-01T00:00:00.000Z",
  "nodes": [{ "id", "title", "intro", "archived", "sourceRefs", "updatedAt" }],
  "edges": [{ "id", "sourceId", "targetId", "relationType" }]
}
```

### 3.2 EXPORT_MARKDOWN_GOLDEN

- 含 6 个 visible 节点标题（不含 archived bert 于正文列表，或标注 archived 节）。
- graphiti 节点（若 post-ingest 测）含来源链接行。
- 文件头：`# my_brain Graph Export`

### 3.3 Round-trip

`importGraphJson(exportGraphJson(SHOWCASE_GRAPH))` 深度等于 `SHOWCASE_GRAPH_SNAPSHOT`（允许字段顺序归一化）。

## 4. 数据结构 / store

| 输出 | 说明 |
|---|---|
| Markdown | 人类可读；F2 README 示例 |
| JSON | 机器可读；F1 agent 可离线读文件（非 MCP） |

## 5. 验收清单

- [ ] Markdown golden 快照通过。
- [ ] JSON golden + schemaVersion 校验。
- [ ] Round-trip 单测通过（A1 graph）。
- [ ] Archived 节点导出标记 `archived: true`（非省略）。
- [ ] sourceRefs 完整导出（D1）。
- [ ] Export 不 mutate source graph。
- [ ] MCP 默认不提供 import write（F1 对齐）。

## 6. 涉及不变量

- **本地优先**；导出本地文件。
- **Archive 非 delete**；导出含 archived。
- **节点 = 概念 + intro + 来源**。
- **不导出**原始音频/新闻全文。

## 7. 测试（harness）

- `exportGraphMarkdown.test.ts`
- `exportGraphJson.test.ts`
- `importGraphJson.roundtrip.test.ts`

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| PII 泄漏 | 导出字段白名单；无 env/key |
| schema 演进 | schemaVersion + 迁移文档顺延 |

## 9. DoD

- `pnpm check` 全绿；export + round-trip 绿。
- 文档片段可粘贴到 README（A4/F 后续）。

---

## Harness（验收协议）

### Scope

- **做：** md/json export、schema、golden、round-trip、CLI。
- **不做：** MCP、cloud sync、profile export。

### Input fixtures

- A1 `SHOWCASE_GRAPH_SNAPSHOT`
- `EXPORT_MARKDOWN_GOLDEN`, `EXPORT_JSON_GOLDEN`

### User actions

1. Harness `exportGraphJson(graph)` → snapshot compare。
2. Round-trip import → deepEqual normalized graph。
3. （可选）CLI 写 tmp 文件。

### Expected observations

- 输出文件 stable hash。
- 源 graph store 不变。

### Assertions

```text
Given SHOWCASE_GRAPH_SNAPSHOT
When exportGraphJson then importGraphJson
Then graph deepEqual golden
When exportGraphMarkdown
Then matches EXPORT_MARKDOWN_GOLDEN
And graphStore unchanged
```

### Forbidden behaviors

- Export 含 API keys / .env。
- Import 静默覆盖生产 graph 无 confirm（prod UI）。
- Export 省略 archived 节点 without flag。
- MCP auto-import。

### Failure recovery

| 失败 | 行为 |
|---|---|
| schema 不匹配 | import 拒绝 + 版本 hint |
| 磁盘写失败 | CLI exit 1 + message |

### Verification commands

```bash
pnpm test -- exportGraphMarkdown exportGraphJson importGraphJson.roundtrip
pnpm check
# optional: pnpm export:graph --format=json --out=tmp/showcase.json
```

### Out-of-scope

- GraphML / Neo4j 导出。
- Encrypted export。
- Auto sync to GitHub Gist。
