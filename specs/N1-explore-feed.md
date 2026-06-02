# N1 — 探索 · 资讯流（`explore-feed`）

- **阶段：** A（建议跟 A4 前后）· **状态：** ✅ 已实现
- **上游：** N0（分区路由）、现有 `newsQueue`/`NewsSource`/`useNewsIngestSession` · **下游：** 无

## 1. 目标
把「探索」导航项做成**今日资讯/趋势浏览区**：列出本次启动抓取的候选资讯（RSS + GitHub trending），可逐条「讲解 / 入库?（建议→确认）/ 跳过」。本质是把底部 ingest 卡片升级成一个可回看的列表视图，让用户主动探索而非只被动弹窗。

## 2. 非目标
- 不新增抓取来源（沿用现有 `NewsSource` 实现）。
- 不持久化原文（符合不变量 1：原文聊完即丢；只在内存/会话内展示）。
- 不绕过收件箱：入库仍是「建议→用户确认→`applyGraphMutation`」。

## 3. 契约
```
src/components/explore/ExploreFeed.tsx     // 资讯卡片列表（来源标签/标题/时间），复用 ingest 动作
src/components/explore/NewsCard.tsx        // 单条：讲解/入库?/跳过；状态（待处理/已入库/已跳过）
```
- 数据源：`useAppStore.newsQueue` + `useIngestStore`（cursor/skipped/ingested）。
- 入库动作复用 `useNewsIngestSession`（`requestIngest`→`SuggestConfirmDialog`→`confirmProposal`）。
- 挂载：`NAV_SECTIONS` 中 `explore` 改为 `live`，`AppShell` 在该分区渲染 `<ExploreFeed>`。
- 空态：无候选时显示「今日无新候选，已是最新」。

## 4. 验收清单
- [x] 「探索」分区列出当前 `newsQueue` 全部候选，状态标签正确。（`ExploreFeed` + `newsItemStatus`；`ExploreFeed.test.ts`）
- [x] 在列表内对一条「入库?」→ 弹 `SuggestConfirmDialog` → 确认后星图新增节点、该条标记「已入库」。（复用 `useNewsIngestSession.requestIngest/confirmProposal`）
- [x] 「跳过」后标记且不改图谱。（`markSkipped` / `skipCurrent`；`ExploreFeed.test.ts`）
- [x] 不写入任何原文到存储（断言只落库图谱变更）。（不变量测试 + ingest 仅存图谱变更路径）
- [ ] 截图反馈闭环：探索→确认→星图变化。（待补 `?visual=explore` 目标；逻辑由 `visual:loop` boot/main/inbox 守护）

## 5. 测试（harness）
- `ExploreFeed` 交互测试（mock store/providers）：渲染条数、入库/跳过调用正确、状态流转。
- 复用 `graphMutations.test.ts` 模式断言入库结果与手动路径一致。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 与底部 ingest 卡片重复 | 底部卡片保留为「冷启动首条提示」（见 NewsIngestPanel 自动消失策略），探索区为完整可回看列表；二者共用同一 hook，无状态分叉 |

## 7. DoD
`pnpm check` 全绿 + 探索区确认闭环截图通过；不变量 1/2/6 守住。
