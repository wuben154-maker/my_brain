# KOS-A1 — Showcase 固定 Demo Fixtures（`demo-fixtures`）

- **阶段：** KOS-A · **状态：** ✅ 已实现
- **上游：** V0–V7（复用已实现骨架）· **下游：** KOS-A2、KOS-A3、KOS-A4
- **复用：** `graphDemoSeed.ts`、`mockConversationFixtures.ts`、`visualSnapshotFixtures.ts`、`autoCurate.ts`、`parseIngestCommand.ts`
- **依赖 / 前置里程碑：** V 系列 companion 主流程已可 mock 演示（V0–V7 ✅）
- **可并行性：** 与 KOS-A4 文档可并行起草；**阻塞 KOS-A2/A3**（下游消费本 spec 的 fixture 契约）

> **定位：** 为 Milestone A（Showcase OS Seed）提供**确定性、无网络、无 API key** 的固定输入集。所有下游 KOS-A spec 的 harness 必须引用本文件定义的 ID、快照与口令，不得各自发明第二套 demo 数据。

## 1. 目标

定义并落地一套 **Showcase Demo Fixture Pack**，使 GitHub 访问者与评测 harness 在相同输入下得到相同输出：

1. **固定 demo graph**（7 节点 + 5 边，含 1 个已归档节点示例）。
2. **3 条 briefing items**（AI/GitHub 趋势，会话级 `newsQueue`）。
3. **1 条可入库概念**（第 3 条 briefing 对应的概念候选，非新闻碎片）。
4. **1 条确定性 auto-curate 结果**（入库后固定 `link` 到已有节点，含 reason code）。
5. **Mock voice 操作脚本**（三口令 + 启动跳过 + undo 触发口令的可断言序列）。

## 2. 非目标

- 不实现 Radar MVP（`WorldItem` / `RadarSignal` 属 KOS-B 系列）。
- 不新增真实 NewsSource 或 live API 依赖。
- 不扩展图谱 schema（仍 `Concept` + `intro` + `sourceUrl` + `archived`）。
- 不修改用户确认入库门控（create 仍仅 V3 / `ingestActions` 出口）。
- 不让记忆引擎写图谱/画像；fixture 不包含 EverMemOS 写路径。

## 3. 契约 / 涉及文件

```
src/showcase/showcaseFixtures.ts          # 新增：本 spec 真源（导出常量 + 工厂函数）
src/showcase/showcaseDemoMode.ts          # 新增：?showcase=1 或 env SHOWCASE_DEMO=1 门控
src/lib/graphDemoSeed.ts                  # 复用/对齐：SHOWCASE_GRAPH_SNAPSHOT 与 createGraphDemoSnapshot 一致
src/conversation/mockConversationFixtures.ts  # 迁移/引用：SHOWCASE_BRIEFING_ITEMS 取代 ad-hoc FIXTURE_NEWS
src/lib/visualSnapshotFixtures.ts         # 可选对齐：DEMO_VOICE_TRANSCRIPTS 引用 showcase 口令
src/providers/voice/mockVoiceProvider.ts  # 扩展：SHOWCASE_VOICE_SCRIPT 逐步 speak / transcript 注入
src/agent/curation/autoCurate.ts          # 消费：SHOWCASE_AUTO_CURATE_GOLDEN（测试夹具，非改算法）
```

### 3.1 固定 Demo Graph（`SHOWCASE_GRAPH_SNAPSHOT`）

与 `createGraphDemoSnapshot()` 对齐，**时间戳冻结**为 `2026-06-01T00:00:00.000Z`：

| id | title | intro | archived | sourceUrl |
|---|---|---|---|---|
| `demo-transformer` | Transformer | 自注意力序列建模架构 | false | `https://arxiv.org/abs/1706.03762` |
| `demo-attention` | Self-Attention | Query/Key/Value 注意力机制 | false | null |
| `demo-rag` | RAG | 检索增强生成 | false | null |
| `demo-agent` | AI Agent | 工具调用与任务编排 | false | null |
| `demo-llm` | LLM | 大语言模型 | false | null |
| `demo-mcp` | MCP | Model Context Protocol | false | null |
| `demo-bert` | BERT | 双向编码器（已归档示例） | **true** | null |

边（5 条，id 固定 `e1`–`e5`）：`demo-attention → demo-transformer (is_a)`；`demo-rag → demo-llm (depends_on)`；`demo-agent → demo-llm (depends_on)`；`demo-agent → demo-mcp (related)`；`demo-bert → demo-transformer (replaces)`。

**可见图断言：** `visibleGraph` 节点数 = 6（不含 `demo-bert`）。

### 3.2 三条 Briefing Items（`SHOWCASE_BRIEFING_ITEMS`）

类型沿用 `NewsItem`；`newsQueue` 在 showcase 模式下**仅此 3 条、固定顺序**：

| id | category | title | summary（讲解用） | sourceUrl |
|---|---|---|---|---|
| `showcase-brief-1` | `ai_news` | OpenAI Realtime API 更新 | 原生 speech-to-speech，支持 barge-in 打断。 | `https://example.com/realtime` |
| `showcase-brief-2` | `github_trending` | `voice-agent-starter` | GitHub 热榜：可插拔 VoiceProvider 的 Agent 脚手架。 | `https://github.com/example/voice-agent-starter` |
| `showcase-brief-3` | `ai_news` | Graphiti 时序知识图谱 | 把对话与文档整理为可演化图谱；适合个人认知 OS。 | `https://example.com/graphiti` |

**Briefing 规则：** conductor 按 `newsCursor` 0→1→2 串讲；第 1、2 条用于「不要 / 讲细点」演示；**第 3 条为唯一 designated ingest 候选**（见 §3.3）。

### 3.3 一条可入库概念（`SHOWCASE_INGEST_CANDIDATE`）

由 `showcase-brief-3` 经 `buildCreateProposalFromNews`（或等价纯函数）生成：

| 字段 | 值 |
|---|---|
| 概念 title | `Graphiti` |
| intro | `时序知识图谱：把对话与文档整理为可演化的个人认知资产。` |
| sourceUrl | `https://example.com/graphiti` |
| 预期新节点 id | `showcase-ingest-graphiti`（create payload 显式指定，保证确定性） |

**非目标碎片：** intro 不得等于新闻标题原文；不得把 RSS summary 整段复制为节点正文。

### 3.4 一条确定性 Auto-Curate 结果（`SHOWCASE_AUTO_CURATE_GOLDEN`）

**触发条件：** 仅当新节点 `showcase-ingest-graphiti` 入库成功后，`autoCurate` 在 showcase profile + showcase graph 下产出**唯一**整理 mutation（其余 merge/archive 在本夹具中禁用或阈值为 0）。

| 字段 | 值 |
|---|---|
| kind | `link` |
| sourceId | `showcase-ingest-graphiti` |
| targetId | `demo-agent` |
| relationType | `related` |
| reasonCode | `ingest_link` |
| reasonDetail | `新概念 Graphiti 与已有 AI Agent 编排能力相关，自动连边。` |
| summary（中文 UI/语音） | `已把 Graphiti 连到 AI Agent` |

**图变化断言：** 端到端 showcase 完成后，相对初始图多 1 个用户确认创建的节点 + 1 条自动整理连边；单独的 auto-curate entry 仅新增 1 条连边。无 merge、无 archive、无静默 create。

### 3.5 Mock Voice 操作脚本（`SHOWCASE_VOICE_SCRIPT`）

Harness 通过 `MockVoiceProvider.injectTranscript` 或等价 API 按序注入：

| step | 动作 | transcript | 预期解析 |
|---|---|---|---|
| 0 | 启动后跳过剩余自检（可选） | `跳过` / barge-in interrupt | 进入 `loading` → `companion` |
| 1 | briefing 条 1 | `不要` | `skip` |
| 2 | briefing 条 2 | `讲细点` | `elaborate`（depth+1，再次 ingest 问句） |
| 2b | 条 2 二次问 | `不要` | `skip` |
| 3 | briefing 条 3 | `入` | `ingest` → create `showcase-ingest-graphiti` |
| 4 | 整理报告后（A3） | UI undo / explicit harness undo event | 触发 `graphHistoryStore.undo`；语音「撤销」仅用于确认意图提示，不自动执行 |

歧义口令回归：`入库吧`（attempt 1）→ `reprompt`；`算了算了` → `skip`。

## 4. 数据结构 / store

| Store / 模块 | Showcase 行为 |
|---|---|
| `appStore.newsQueue` | showcase 模式 = `SHOWCASE_BRIEFING_ITEMS`（覆盖 launch 抓取） |
| `graphStore` | 初始加载 `SHOWCASE_GRAPH_SNAPSHOT`（或空图冷启动变体由 A2 定义） |
| `ingestStore` | `ingestedIds` 含 `showcase-brief-3` 后触发 auto-curate |
| `graphHistoryStore` | auto-curate 至少 1 条 entry（A3 细化）；用户确认入库本身不强制进入 graph history |
| `profile` | `DEFAULT_USER_PROFILE` + 固定 `personaId: "mentor"` |

## 5. 验收清单

- [ ] `src/showcase/showcaseFixtures.ts` 导出 §3.1–§3.5 全部常量；单测断言 JSON 快照稳定。
- [ ] `?showcase=1`（或 `SHOWCASE_DEMO=1`）启用后，`newsQueue.length === 3` 且 id 顺序固定。
- [ ] Showcase 图加载后 `visibleGraph` 节点数 = 6，`demo-bert` 不可见但 `loadGraph` 可恢复。
- [ ] 对 `showcase-brief-3` 执行 ingest 后，节点 `showcase-ingest-graphiti` 存在且含 `sourceUrl`。
- [ ] Auto-curate 产出与 `SHOWCASE_AUTO_CURATE_GOLDEN` 完全一致（kind、端点、reasonCode）。
- [ ] Mock voice script step 1–3 在 harness 中可回放，三口令解析与 V3 一致。
- [ ] **无 API key、无网络** 条件下 `pnpm test -- showcaseFixtures` 全绿。
- [ ] 不变量：无任何路径绕过 ingest 门控 create；记忆引擎 fixture 不写图谱。

## 6. 涉及不变量

- **新建节点 = 用户确认**（仅 designated brief + 「入」）。
- **整理 = 入库后自动**（本夹具仅 1 条确定性 link）。
- **删除 = 归档**（demo-bert 示范 archived，非 DELETE）。
- **本地优先 / Provider 可换**（全部 mock）。
- **记忆引擎不写图谱/画像**。
- **外部 agent 只读**（MCP 不参与 showcase 写路径）。

## 7. 测试（harness）

- `showcaseFixtures.test.ts`：常量完整性、快照序列化 round-trip。
- `showcaseDemoMode.test.ts`：query flag / env 门控。
- `showcaseAutoCurateGolden.test.ts`：给定 graph + 新节点，mutation 列表 === golden。
- `showcaseVoiceScript.test.ts`：`parseIngestCommand` 与脚本逐步对齐。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 与 `graphDemoSeed` / `FIXTURE_NEWS` 漂移 | 本文件为真源；旧 fixture 改为 re-export |
| autoCurate 非确定性（阈值浮动） | showcase 模式下降级为规则链：ingest_link 优先、禁用 merge/archive |
| 多条 brief 都可 ingest 导致演示漂移 | 仅 `showcase-brief-3` 在文档与测试中标注为 golden ingest |
| 时间戳导致快照抖动 | 全局冻结 `SHOWCASE_NOW` |

## 9. DoD

- `pnpm check` 全绿；showcase fixture 单测绿。
- 下游 KOS-A2/A3 可直接 import 本 spec 常量跑通 3 分钟闭环。
- 本 spec §Harness 全部章节可映射到测试用例名。

---

## Harness（验收协议）

### Scope

- **做：** 定义 Showcase 级固定 graph、briefing、ingest 候选、auto-curate golden、voice 脚本与启用门控。
- **不做：** 核心循环编排（A2）、undo/UI 报告（A3）、GitHub 文档（A4）、Radar 模型（B 系列）。

### Input fixtures

- `SHOWCASE_GRAPH_SNAPSHOT`（§3.1）
- `SHOWCASE_BRIEFING_ITEMS`（§3.2）
- `SHOWCASE_INGEST_CANDIDATE` / `SHOWCASE_AUTO_CURATE_GOLDEN`（§3.3–§3.4）
- `SHOWCASE_VOICE_SCRIPT`（§3.5）
- `DEFAULT_USER_PROFILE` + `personaId: "mentor"`

### User actions

- 启用 showcase 模式（URL flag 或 env）。
- （可选）注入启动跳过 transcript。
- Harness 按脚本注入三口令序列。

### Expected observations

- `newsQueue` 为 3 条固定 id。
- Graph 初始快照与 §3.1 一致。
- Ingest 后新节点 id = `showcase-ingest-graphiti`。
- Auto-curate 后新增边 `showcase-ingest-graphiti → demo-agent`。

### Assertions

- Vitest 快照：`showcaseFixtures.test.ts`。
- `autoCurate` golden 深度相等断言（mutation + reasonCode + reasonDetail）。
- `visibleGraph` 节点数 = 6（初始）。
- `productInvariants`：showcase 路径无静默 create。

### Forbidden behaviors

- Briefing 直接 `applyGraphMutation(create)` 绕过 ingest。
- Showcase 模式访问外网 NewsSource。
- 记忆引擎 `remember` 写入图谱节点。
- Auto-curate 在 showcase 夹具中产出 merge/archive（除非单测显式测非 golden 分支）。
- MCP / 外部 agent 写入 `KnowledgeNode`。

### Failure recovery

- Showcase flag 未启用：回退现有 dev mock（`FIXTURE_NEWS`），不阻塞 `pnpm dev`。
- Fixture 模块加载失败：启动报错含 `showcaseFixtures` 路径 hint；禁止静默空队列。
- Auto-curate golden 不匹配：测试 fail 并打印 diff mutation；demo 模式显示「整理异常，可撤销」占位（A3）。

### Verification commands

```bash
pnpm test -- showcaseFixtures showcaseDemoMode showcaseAutoCurateGolden showcaseVoiceScript
pnpm check
```

### Out-of-scope

- 真实 OpenAI Realtime / LLM key。
- Radar 个性化排序与 `RadarSignal` UI。
- Weekly Brain Review、Interview Mode。
- SQLite 迁移新表（沿用现有 `graph_history`）。
- README / DEMO / ARCHITECTURE 文档正文（KOS-A4）。
