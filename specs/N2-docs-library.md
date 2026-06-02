# N2 — 文档库 · 来源库（`docs-library`）

- **阶段：** B（建议 B 段穿插）· **状态：** 📝 待做
- **上游：** N0、现有图谱（`ConceptNode.sourceUrl`）· **下游：** 无

## 1. 目标
把「文档库」导航项做成**来源/出处索引区**：聚合所有带 `sourceUrl` 的概念节点，按来源域名/时间归类，点击可跳到外部来源、或在星图中定位该概念。让「节点 ← 来源链接」这条产品关系（PRODUCT.md 来源链接）有专门的浏览入口。

## 2. 非目标
- 不存储/缓存文章原文（不变量 1）；只存图谱里已有的 `sourceUrl` + 概念元数据。
- 不做全文搜索（仅按标题/来源筛选）。

## 3. 契约
```
src/components/docs/DocsLibrary.tsx   // 来源分组列表：域名分组 → 概念条目（标题+简介+打开来源/定位星图）
src/lib/sourcesIndex.ts               // 纯函数：从图谱快照聚合 { domain, items: ConceptNode[] }[]
```
- 数据：`useGraphStore`（可见节点）筛 `sourceUrl != null`。
- 动作：「打开来源」→ 新标签/外部打开 `sourceUrl`；「在星图中查看」→ `uiStore.setSection("graph")` + `graphStore.selectNode(id)` + 高亮。
- 挂载：`NAV_SECTIONS` 中 `docs` 改 `live`，分区渲染 `<DocsLibrary>`。
- 空态：无来源节点时提示「还没有带来源的概念，去『探索』入库几条吧」。

## 4. 验收清单
- [ ] 列出所有带来源的概念，按域名正确分组、计数正确。
- [ ] 「在星图中查看」切回 graph 分区并选中/高亮目标节点。
- [ ] 「打开来源」打开正确 URL。
- [ ] 归档节点默认不出现（与星图可见性一致）。
- [ ] 截图留证。

## 5. 测试（harness）
- `sourcesIndex.test.ts`：分组/计数/排除归档/空集。
- `DocsLibrary` 交互测试：定位动作调用 `setSection`+`selectNode`。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 与星图信息重复 | 定位为「按来源」的正交视角；动作回链星图，不复制图谱状态 |

## 7. DoD
`pnpm check` 全绿 + 截图；不变量 1（不存原文）守住。
