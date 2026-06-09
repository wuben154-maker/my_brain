# KOS-A2 — Showcase 核心闭环（`core-loop`）

- **阶段：** KOS-A · **状态：** ✅ 已实现
- **上游：** KOS-A1 · **下游：** KOS-A3、KOS-A4
- **复用：** V1 `runLaunchSequence`、V2 `ConversationConductor`、V3 `ingestActions`、V4 `runAutoCurateAfterIngest`、V6 星图高亮
- **依赖 / 前置里程碑：** **KOS-A1**（fixture 真源）；V0–V7 ✅
- **可并行性：** 与 KOS-A3 设计可并行；**实现顺序：A1 → A2 → A3**

> **定位：** 把 Milestone A 的 **3 分钟核心体验** 钉成可重复执行的闭环：**启动 → 自检 → 简报 → 入库 → 星图点亮 → 自动整理**。全程 mock-first，消费 KOS-A1 固定输入。

## 1. 目标

在 **showcase 模式**下实现并验收一条确定性用户旅程：

```
boot → self_check → loading → companion
  → briefing ×3（skip / elaborate / ingest）
  → 星图点亮新节点
  → auto-curate（固定 link）
  →（口头汇报节流，详情见 A3）
```

使 GitHub 访客与 CI harness **无需 API key** 即可复现「这不是聊天壳，而是有写入边界的知识 OS」。

## 2. 非目标

- 不新增 Radar 抓取与 `WorldItem` 持久化（B 系列）。
- 不改 V3 三口令语义与 reprompt 规则。
- 不实现整理报告浮层与 undo UI（KOS-A3）。
- 不写 README/DEMO 文档（KOS-A4）。
- 不接 live Voice/LLM；showcase 路径强制 Mock Provider。
- 不做冷启动空图变体（showcase 默认 **预置 demo graph**；空图 onboarding 仍走 V2 既有路径，非本 spec 主验收）。

## 3. 契约 / 涉及文件

```
src/showcase/runShowcaseLaunchSequence.ts   # 新增：包装 runLaunchSequence，注入 A1 fixtures
src/showcase/showcaseCompanionScript.ts     # 新增：briefing 逐步 Turn 期望（供 e2e/harness）
src/lib/runLaunchSequence.ts                # 扩展：检测 showcase 模式 → 跳过 live fetch
src/conversation/ConversationConductor.ts   # 扩展：showcase briefing 逐步推进断言 hook
src/conversation/ingestActions.ts           # 复用：ingest 唯一 create 出口
src/lib/runAutoCuratePipeline.ts            # 复用：ingest 后触发；showcase 下 golden 断言
src/components/shell/ImmersiveScene.tsx       # 扩展：showcase 角标 Mock/Demo 状态
src/components/brain/BrainGraphView.tsx     # 复用：新节点高亮 / 点亮动画
```

### 3.1 Showcase 启动序列

```
runShowcaseLaunchSequence(deps):
  1. setPhase("boot") → 最短 BOOT_INTRO_MS
  2. setPhase("self_check") → speakSelfCheck(mockVoice) — 可 interrupt 跳过
  3. setPhase("loading"):
       - graphStore ← SHOWCASE_GRAPH_SNAPSHOT
       - newsQueue ← SHOWCASE_BRIEFING_ITEMS
       - 不调用 live NewsSource
  4. setPhase("companion") → conductor.enterShowcaseBriefing()
```

**降级：** 自检单项 `warn` 仍继续；仅 storage 致命错误 → `phase: error`。

### 3.2 Briefing 状态机（showcase 子态）

在 `ConversationConductor` 上叠加 **可测试的逐步 briefing**（`showcaseBriefingStep: 0|1|2|done`）：

| step | 资讯 id | 用户动作（A1 脚本） | 系统行为 |
|---|---|---|---|
| 0 | `showcase-brief-1` | `不要` | skip，`newsCursor++`，无 create |
| 1 | `showcase-brief-2` | `讲细点` | elaborate 一次，再问 ingest |
| 1b | `showcase-brief-2` | `不要` | skip |
| 2 | `showcase-brief-3` | `入` | `applyIngestCreate` → `showcase-ingest-graphiti` |
| post | — | — | `runAutoCurateAfterIngest` → golden link |

每条 briefing：**讲解 Turn**（mock LLM 固定文案）→ **ingest 问句 Turn**（「要把这个放进你的大脑吗？」类）。

### 3.3 星图点亮（star-light）

入库成功后：

- `graphStore` 更新，`visibleGraph` 含新节点。
- V6 walkthrough / highlight：`focusNodeId = showcase-ingest-graphiti`，脉冲动画 ≥1s（mock 时钟可加速）。
- Voice Turn（可选）：「好，Graphiti 这颗星亮了。」

### 3.4 Auto-curate 挂钩

`applyIngestCreate` 返回后 **同步调度** `runAutoCurateAfterIngest`（与 V4 一致）：

- showcase 模式：断言 mutation === `SHOWCASE_AUTO_CURATE_GOLDEN`。
- 写入 `graphHistoryStore` 一条 entry（A3 展示 reason / undo）。

## 4. 数据结构 / store

| Store | Showcase 核心循环字段 |
|---|---|
| `appStore.phase` | `boot` → `self_check` → `loading` → `companion` |
| `appStore.newsQueue` / `newsCursor` | 3 条固定 brief；cursor 与 briefing step 同步 |
| `graphStore` | 初始 snapshot → ingest 后 +1 节点 → curate 后 +1 边 |
| `ingestStore` | `skippedIds` 含 brief-1、brief-2；`ingestedIds` 含 brief-3 |
| `conversationStore` | `mode: briefing` → `ingest_decision` 交替 |
| `graphHistoryStore` | ingest 后至少有 auto-curate entry |

## 5. 验收清单

- [ ] `?showcase=1` 启动：phase 序列完整，**无网络请求**（mock NewsSource 调用次数 = 0）。
- [ ] loading 结束：`newsQueue.length === 3`，graph 节点数 = 7（含 1 archived）。
- [ ] Briefing step 0：`不要` 后无新节点，`newsCursor === 1`。
- [ ] Briefing step 1：`讲细点` 后 `elaborationDepth >= 1`，同一 item 再次 ingest 问句。
- [ ] Briefing step 2：`入` 后节点 `showcase-ingest-graphiti` 存在，含 sourceUrl。
- [ ] 星图高亮聚焦新节点（行为测试或 visual companion 快照）。
- [ ] Auto-curate 产出 golden link；`graphHistoryStore.entries.length >= 1`。
- [ ] 全程无 `saveProposal(..., pending)`、无 inbox 路径。
- [ ] 记忆引擎未写入图谱（scan `applyGraphMutation` 调用栈）。
- [ ] Brain MCP 保持只读；showcase 核心循环不新增、不暴露 MCP `create/update/delete/merge/archive` 写工具。
- [ ] Mock voice：`SHOWCASE_VOICE_SCRIPT` 全流程回放 e2e 绿。

## 6. 涉及不变量

- **入库 = 用户语音确认**（V3）；showcase 仅第 3 条 brief 演示 create。
- **入库后整理 = 自动**（V4）；showcase 固定 1 条 link。
- **节点 = 概念 + 简介 + 来源**；非新闻碎片。
- **可打断语音**：自检与 briefing 口播可 `interrupt`。
- **本地优先 / mock-first**。
- **记忆引擎不写图谱/画像**。
- **Brain MCP 默认只读**；外部 agent 不参与 showcase 写路径。

## 7. 测试（harness）

- `runShowcaseLaunchSequence.test.ts`：phase 迁移、fixture 注入。
- `showcaseCompanionScript.test.ts`：逐步 briefing 事件序列。
- `showcaseCoreLoop.integration.test.ts`：启动 → 三口令脚本 → 图状态断言。
- `companion.e2e.test.ts` 扩展：`describe("showcase core loop")` 场景。
- 复用：`ingestActions.test.ts`、`runAutoCuratePipeline.test.ts` golden 分支。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| launch 仍走 live fetch | showcase 分支显式短路 `runLaunchSequence` |
| conductor 与 ingest cursor 不同步 | `showcaseBriefingStep` 显式状态；单测逐步推进 |
| 高亮动画 flaky | mock clock + 行为断言 focusNodeId，visual 为辅 |
| 与 V2 冷启动脚本冲突 | showcase 模式禁用 onboarding 子态 |

## 9. DoD

- `pnpm check` 全绿；`showcase core loop` e2e/integration 绿。
- 开发者可在 `pnpm dev` + `?showcase=1` 下 3 分钟内手动走通闭环。
- KOS-A3 可基于本循环产生的 `graphHistoryStore` entry 测 undo/report。

---

## Harness（验收协议）

### Scope

- **做：** showcase 模式下启动链、3 条 briefing 逐步决策、ingest create、星图点亮、auto-curate 触发。
- **不做：** 整理 reason UI、undo 控件、GitHub 文档、Radar 排序。

### Input fixtures

- 全部引用 **KOS-A1** `SHOWCASE_*` 常量。
- Mock `VoiceProvider`、`LlmProvider`、`NewsSource`、`EmbeddingProvider`。

### User actions

1. 打开应用 `?showcase=1`（或设置 `SHOWCASE_DEMO=1`）。
2. （可选）跳过自检播报。
3. 等待进入 companion / briefing。
4. 按 A1 voice script：条1「不要」→ 条2「讲细点」→「不要」→ 条3「入」。

### Expected observations

| 阶段 | 可观测输出 |
|---|---|
| self_check | `appStore.selfChecks` 有项；mock voice speak 顺序 |
| loading | 科幻 loading 文案；`newsQueue` 填充 |
| briefing | 3 条 title 依次口播；ingest 问句出现 |
| ingest | `graphStore` 新增 `showcase-ingest-graphiti` |
| star-light | 星图 focus / 高亮新节点 |
| auto-curate | 新边 `showcase-ingest-graphiti → demo-agent`；history entry |

### Assertions

```text
Given SHOWCASE_GRAPH_SNAPSHOT + SHOWCASE_BRIEFING_ITEMS
When 执行 A1 voice script 全流程
Then visibleGraph 节点数 = 7（6+1 新，不含 archived bert）
And edges 含 showcase-ingest-graphiti → demo-agent
And ingestStore.ingestedIds 含 showcase-brief-3
And graphHistoryStore 含 kind=link, reasonCode=ingest_link
And 无 pending agent_proposals
```

### Forbidden behaviors

- Launch 阶段 live HTTP 抓取（showcase）。
- Briefing 未问用户直接 create。
- Auto-curate 在 ingest 之前运行。
- 记忆引擎或 MCP 写入图谱。
- Brain MCP 暴露 create/update/delete/merge/archive 任一写工具。
- Showcase 路径依赖 `OPENAI_API_KEY`。

### Failure recovery

| 失败 | 行为 |
|---|---|
| storage 初始化失败 | `phase: error`，口播说明，展示重试 |
| voice mock 失败 | 降级文字 transcript；循环继续 |
| auto-curate 无 mutation | 记录 warn；不阻塞 ingest 成功 UI |
| 自检 interrupt | 跳过剩余项，进入 loading |

### Verification commands

```bash
pnpm test -- runShowcaseLaunchSequence showcaseCompanionScript showcaseCoreLoop
pnpm test -- companion.e2e -t "showcase core loop"
pnpm check
# 手动：pnpm dev → http://localhost:1420/?showcase=1
```

### Out-of-scope

- Undo 与整理报告 UI（KOS-A3）。
- README/DEMO/ARCHITECTURE（KOS-A4）。
- `WorldItem` / Radar 相关度 UI。
- 真实 API 验收（`docs/V2_REAL_API_ACCEPTANCE.md`）。
- 多用户、云同步、移动端。
