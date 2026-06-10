# my_brain 架构：个人知识 OS

my_brain 的目标是一个语音优先、local-first 的个人知识操作系统。它不是 RSS 阅读器，也不是普通 RAG 聊天框；核心循环是把外部世界变化讲给用户听，由用户决定哪些进入长期图谱，再由系统自动整理已确认知识，并保留 reason、history 和 undo。

## 成熟度口径（KP-06）

避免「spec 全 ✅ = 产品已成熟」误读。文档与 README 使用三档标签：

| 标签 | 含义 |
|------|------|
| **default** | 正常启动（无 query flag）可见的主路径；mock-first 可演示 |
| **harness-backed** | 逻辑与 Vitest harness 已覆盖；UI 或 live API 可能仍 partial |
| **experimental** | 演示/降级/Phase 6–8；不得写进 README 默认承诺 |

复跑验证命令见 [`docs/evals/README.md`](./evals/README.md)。

## 默认体验 — 三条路径（裁定一致）

| 路径 | 触发 | 成熟度 | 说明 |
|------|------|--------|------|
| **Radar 默认** | 无 query flag / 正常启动 | **default** | mock-first top 3 + `RadarSignal`；live 成功则增强，失败 fixture fallback |
| **Showcase 演示** | `?showcase=1` | **experimental** | 固定演示脚本；面试/截图专用，**不是**默认产品入口 |
| **RSS flatten legacy** | Radar/source 全失败时内部 fallback | **experimental** | 降级遗留路径；**不得**文档化或渲染为主体验 |

## 四层知识 OS

| 层 | 职责 | Stage 1 状态 |
|---|---|---|
| 信息雷达层 | 从 AI / GitHub / RSS 等来源发现变化，形成 briefing 候选 | **default**：无 flag Radar mock-first top 3；**experimental**：`?showcase=1` 固定项 |
| 语音伴侣层 | 用可中断语音讲解、追问、接收「入 / 不要 / 讲细点」 | Mock-first 核心闭环已可演示 |
| 个人知识图谱层 | 保存长期概念节点、关系、来源、归档状态和结构历史 | Stage 1 以 concept graph + graph history 为主 |
| 认知操作层 | 基于图谱生成复习、面试、项目、写作、研究建议 | Stage 1 仅展示边界；行动建议和草稿生成是 roadmap |

## 数据流

```mermaid
flowchart LR
  radar[信息雷达] --> briefing[每日简报]
  briefing --> companion[语音伴侣]
  companion --> choice{用户意图}
  choice -->|"不要"| discard[会话内丢弃]
  choice -->|"讲细点"| teaching[个性化讲解]
  teaching --> companion
  choice -->|"入"| ingest[用户确认入库]
  ingest --> graph[知识图谱]
  graph --> curation[自动整理]
  curation --> history[历史与撤销]
  graph --> actions[认知操作层]
```

**Radar 默认**（主路径）：

```text
正常启动（无 flag）
  -> runLaunchSequence Radar branch
  -> daily top 3 + RadarSignal
  -> 用户语音「入 / 不要 / 讲细点」
  -> applyIngestCreate（仅「入」）
  -> auto-curate + graphHistoryStore undo
```

**Showcase 演示**（`?showcase=1`，非默认）：

```text
?showcase=1
  -> SHOWCASE_GRAPH_SNAPSHOT
  -> showcase-brief-1 / showcase-brief-2 / showcase-brief-3
  -> 用户说「入」
  -> showcase-ingest-graphiti
  -> auto-curate link(reasonCode: ingest_link)
  -> graphHistoryStore undo
```

**RSS flatten legacy** 仅在 Radar/source 失败时内部降级；不得作为文档或 UI 的主入口文案。

## 目录映射

| 概念 | 主要路径 | 说明 |
|---|---|---|
| 应用入口 | `src/App.tsx` | 组合全屏星图、语音伴侣、设置与浮层 |
| 启动流程 | `src/lib/runLaunchSequence.ts` | **default** Radar 启动链；`?showcase=1` 走 showcase wrapper |
| Showcase 启动 | `src/showcase/runShowcaseLaunchSequence.ts` | `?showcase=1` 的确定性启动入口 |
| Showcase fixtures | `src/showcase/showcaseFixtures.ts` | 固定 graph、briefing、ingest candidate、golden curation |
| Showcase 脚本 | `src/showcase/showcaseCompanionScript.ts` | 三口令逐步 briefing 期望 |
| 语音伴侣状态机 | `src/conversation/ConversationConductor.ts` | briefing、讲细点、入库意图推进 |
| 入库门控 | `src/conversation/ingestActions.ts` | 用户确认 create 的核心出口 |
| 解析口令 | `src/lib/parseIngestCommand.ts` | 「入 / 不要 / 讲细点」等意图解析 |
| 自动整理 | `src/lib/runAutoCuratePipeline.ts`、`src/agent/curation/autoCurate.ts` | 入库后 link / merge / archive 等结构整理 |
| 整理报告 | `src/conversation/curationReport.ts`、`src/components/curation/CurationReportOverlay.tsx` | reason summary、口播节流、UI 报告 |
| 历史与撤销 | `src/stores/graphHistoryStore.ts`、`src/components/shell/GraphHistoryPanel.tsx`、`src/components/shell/GraphUndoControl.tsx` | before/after 快照、history 列表、undo |
| 图谱变更 | `src/lib/graphMutations.ts`、`src/domain/graphMutationPayloads.ts` | 图谱结构 mutation 的纯逻辑 |
| Provider 汇总 | `src/providers/index.ts` | Mock / live provider 装配边界 |
| Mock voice | `src/providers/voice/mockVoiceProvider.ts` | Showcase 和测试默认语音路径 |
| Brain MCP | `src/mcp/**` | 外部 agent 只读查询入口，不暴露图谱写工具 |
| 文档展示面 | `README.md`、`docs/DEMO.md`、`docs/SHOWCASE_MOCK_LIVE.md` | GitHub 访客复现与边界说明 |

## 权限四级

| 权限级别 | 允许做什么 | 不允许做什么 | 当前边界 |
|---|---|---|---|
| Read | 读取已确认图谱、来源链接、画像摘要、历史记录 | 修改图谱或外部系统 | Brain MCP 默认只读 |
| Suggest | 提出入库候选、整理理由、学习路线、issue / 文章草稿建议 | 直接创建永久知识或发布外部内容 | 伴侣可以讲解和建议，不能绕过用户意图 |
| Auto-organize | 对已入库内容自动 link / merge / archive / edge-migrate | 自动新建永久图谱节点；硬删除节点 | 每次结构变更必须有 reason、history、undo |
| User-confirmed write | 新建长期知识、重要画像修正、外部写操作确认 | 在没有用户意图时污染永久图谱 | `applyIngestCreate` 是 Showcase 新建节点出口 |

必须保持的产品不变量：

- 新建永久知识节点仅能由用户确认触发；Showcase 中只有用户对 `showcase-brief-3` 说「入」后才创建 `showcase-ingest-graphiti`。
- Brain MCP 只读，不提供 create / update / delete / merge / archive / undo 等写工具。
- `MemoryProvider` 不写图谱、不写画像；它只能为会话提供 recall grounding 或接收会话末蒸馏文本。
- 自动整理只发生在入库之后；它可以连边、合并、归档或迁移边，但必须写入 graph history，且可撤销。
- 删除语义是 archive，不是 hard delete。
- 行动层可以生成建议或草稿，但不会自动发 issue、不会自动发布文章、不会自动执行外部写操作。

## Stage 1 已实现（按成熟度）

Stage 1 目标是可信主闭环，而非完整 Action OS 或 live API 全量验收。

| 能力 | 成熟度 | 证据 / 入口 |
|---|---|---|
| Radar 默认启动 top 3 | **default** | `runLaunchSequence` · [`docs/evals/radar-relevance.md`](./evals/radar-relevance.md) |
| 用户确认入库 (V3) | **default** | `applyIngestCreate` · [`docs/evals/ingest-quality.md`](./evals/ingest-quality.md) |
| 入库后自动整理 + undo (V4) | **default** | `autoCurate` · [`docs/evals/curation-undo.md`](./evals/curation-undo.md) |
| Weekly Review 主路径 | **harness-backed** | `buildWeeklyBrainReview` · KP-03 |
| 画像 / feedback 闭环 | **harness-backed** | [`docs/evals/profile-growth.md`](./evals/profile-growth.md) |
| CognitiveAction 草稿 | **harness-backed** | [`docs/evals/action-usefulness.md`](./evals/action-usefulness.md) |
| Showcase 固定 demo | **experimental** | `?showcase=1` · `SHOWCASE_BRIEFING_ITEMS` |
| RSS flatten legacy fallback | **experimental** | 内部降级 only |
| Mock-first 无 API key | **default** | `pnpm dev` |

## Roadmap

| 阶段 | 目标 | 当前文档边界 |
|---|---|---|
| Stage 2: AI 信息雷达 | 真实来源抓取、相关度排序、RadarSignal 解释 | 不把 `WorldItem` 说成已永久入库 |
| Stage 3: 个人成长伴侣 | 学习轨迹、讲解偏好、画像修正、面试模式 | 画像必须可查看和修正 |
| Stage 4: 图谱进化 | provenance、更多 reason code、weekly brain review | archive 仍不是 hard delete |
| Stage 5: 认知操作层 | issue 草稿、博客草稿、路线图、研究 follow-up | 只生成建议或草稿，不自动发布 |
| Stage 6: 开放知识底座 | 只读 Brain MCP、导出格式、Provider 插件 | 外部 agent 默认不能写图谱 |

短期不承诺 mobile、云同步、多用户系统或自动外部写操作。MVP 仍以 Web / Tauri 桌面、local-first、mock-first 展示闭环为主。

## 参考

- [`docs/evals/README.md`](./evals/README.md)：成熟度标签 + 五类 eval 验证命令。
- [`docs/DEMO.md`](./DEMO.md)：3 分钟复现步骤。
- [`docs/SHOWCASE_MOCK_LIVE.md`](./SHOWCASE_MOCK_LIVE.md)：mock/live provider 边界。
- [`docs/KNOWLEDGE_OS_VISION.md`](./KNOWLEDGE_OS_VISION.md)：长期产品蓝图。
- [`specs/KOS-A1-demo-fixtures.md`](../specs/KOS-A1-demo-fixtures.md)：Showcase fixture 真源。
- [`specs/KOS-A2-core-loop.md`](../specs/KOS-A2-core-loop.md)：核心闭环契约。
- [`specs/KOS-A3-undo-report.md`](../specs/KOS-A3-undo-report.md)：整理报告与 undo 契约。
