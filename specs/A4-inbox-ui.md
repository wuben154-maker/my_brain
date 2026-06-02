# A4 — 收件箱 UI（`inbox-ui`）

- **阶段：** A · **状态：** ✅ 已实现
- **上游：** A2（`proposalStore`）、A3（简报+提议）、N0（分区路由）· **下游：** A5（调度后有内容可看）
- **导航归属：** 承担 `agent`（智能体）分区（见 N0）；落地形态可为分区页或星图侧抽屉，二选一，`NAV_SECTIONS` 先占 `agent` 位。

## 1. 目标
在大脑星图旁加一个「待办建议」入口（铃铛/抽屉）+ 晨间简报卡片，复用 `SuggestConfirmDialog` 交互，让用户**逐条**「同意/拒绝」后台 Agent 产出的提议，确认后星图即时更新。

## 2. 非目标
- 不改落库逻辑（全走 A2 的 `approve/reject`）。
- 不做批量一键全确认（违背「一条条问」气质）。

## 3. 组件契约
```
src/components/agent/ProposalInbox.tsx     // 抽屉：列出 proposalStore.pending，逐条卡片
src/components/agent/InboxBell.tsx         // 入口：未读 pending 数角标
src/components/agent/MorningBriefCard.tsx  // 展示 AgentDigest（纯文字，可关闭即弃）
```
- 接入位置：`AppShell.tsx` 在星图侧栏挂 `InboxBell`，点击开 `ProposalInbox`。
- 每条提议卡片：显示 `summary` + `kind` 标签 + 影响预览（命中节点高亮，复用 `primaryNodeIdFromProposal`），按钮「同意 / 拒绝」。
- 同意 → `proposalStore.approve(...)` → `graphStore` 更新 → 卡片移除；拒绝同理。

## 4. 验收清单（含 §9 端到端 AI 验收）
- [x] App 启动后 `proposalStore.load()` 拉取 pending，铃铛角标数正确。（`useProposalInboxInit` + `runLaunchSequence`；`GraphHeader`/`InboxBell`）
- [x] 逐条「同意」后对应节点在星图出现/更新；「拒绝」后消失且不改图谱。（`useProposalInboxActions` → A2 `approve/reject`）
- [x] 简报卡片可关闭，关闭不持久化原文（符合「原文聊完即丢」）。（`MorningBriefCard` + `agentInboxStore.dismissDigest`；`MorningBriefCard.test.ts`）
- [x] 浏览器自动化截图「收件箱→确认→星图变化」闭环，并与 `DESIGN.md` 视觉对比（`?visual=inbox` + `pnpm visual:loop` 目标 `inbox`；基线 `assets/inbox-approve-empty.png`）。
- [x] 空收件箱有合理空态。（`ProposalInbox` + `ProposalInbox.test.ts`）

## 5. 测试
- `ProposalInbox` 交互测试（mock store）：approve/reject 调用正确、列表更新。
- 端到端：`pnpm dev` + 浏览器自动化跑确认闭环 + 截图。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 与 `DESIGN.md` 视觉不符 | 复用 `GlassCard`/现有 token；用截图反馈闭环逼近设计图 |
| 提议过多造成疲劳 | 按 `created_at` 排序、分页/折叠；上限在 A3 已截断 |

## 7. DoD
`pnpm check` 全绿 + 端到端确认闭环截图通过。
