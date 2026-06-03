# B3 — 调研轨迹视图（`research-view`）

- **阶段：** B · **状态：** ✅ 已实现（`ResearchTrace.tsx`、`ProposalPreview.tsx`、`InsightSection.tsx`、`proposalPreview.ts`）
- **上游：** B1（`trace` + 关联提议）、A4（收件箱 UI）、N0（分区路由）· **下游：** —
- **导航归属：** 挂 `insight`（分析洞察）分区（见 N0）。
- **与 G1 协同：** 「预览高亮」须对**当前激活的星图视图**（2D 或 3D）生效；若 G1 先行，预览实现应同时覆盖 3D。

## 1. 目标
把 `AgentRunResult.trace` 渲染成可读的「调研轨迹」，并在确认前把一批关联提议在星图上**预览高亮**（看清影响范围再决定），呼应 `DESIGN.md` 的「数据流注入大脑 / 串讲高亮」气质。

## 2. 非目标
- 不改 B1 的产出结构。
- 不做确认逻辑（复用 A2/A4）。

## 3. 组件契约
```
src/components/agent/ResearchTrace.tsx     // 时间线渲染 AgentTraceStep[]（步骤名/耗时/输入输出摘要/token）
src/components/agent/ProposalPreview.tsx   // 选中一批提议 → 在 BrainGraphView 预览将新增/变更的节点与连线
```
- 预览用「虚影/高亮」样式（区别于已落库节点），复用 `graphVisualTokens` / `BrainGraphView` 高亮能力与 `primaryNodeIdFromProposal`。
- 预览只渲染，不写图谱；确认后才经 A2 落库。

## 4. 验收清单
- [x] 轨迹时间线正确展示步骤顺序、耗时、token 合计。
- [x] 选中研究批次 → 星图高亮其涉及节点/新增连线（含临时 id 新节点的虚影）。
- [x] 预览态不修改 `graphStore` 持久数据。
- [x] 与 `DESIGN.md` 视觉一致（截图反馈闭环）。

## 5. 测试
- `ResearchTrace` 渲染快照；预览不污染 store 的断言；端到端截图。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 预览态污染真实图谱 | 用派生的「显示快照」叠加层，不写 `graphStore` |
| 大批提议预览卡顿 | 限制单次预览规模；复用现有缩放/分层 |

## 7. DoD
`pnpm check` 全绿 + 预览/轨迹截图通过。
