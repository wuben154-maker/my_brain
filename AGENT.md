# AGENT.md — my_brain 的 Agent 化演进 RFC

> 本文是 `my_brain` 从「被动语音伴侣」演进为「自主知识管家 Agent」的工程蓝图。
> 配套阅读：`PRODUCT.md`（产品共识）、`AGENTS.md`（技术约束）、`DESIGN.md`（视觉系统）。
> 本文遵循 harness engineering 思路：先把**目标、不变量、接口、里程碑、验收**钉死，再写代码。

---

## 0. 状态与定位

- **当前状态：** MVP 主体已实现（自检 / 加载动画 / 可打断语音 / 资讯抓取 / 先建议后确认的图谱操作 / 分层缩放图谱 / 手动编辑 / 用户画像层 / 本地 SQLite）。
- **本 RFC 的范围：** 在**不破坏任何核心不变量**的前提下，给系统加上「自主性」——让它能在后台主动工作、跑多步推理、并越来越懂用户。
- **一句话目标：** 把交互模型从 **请求-响应（Request→Response）** 升级为 **感知-规划-行动-复盘（Sense→Plan→Act→Reflect）**，但所有改图谱的「行动」仍然 **先建议、用户确认后才执行**。

---

## 1. 设计原则（Agent 化时必须守住）

1. **不变量优先。** `AGENTS.md` 的 7 条核心不变量是产品的灵魂，Agent 再自主也不得违反。尤其：
   - 三层记忆分离（原始音频/原文丢弃；图谱永久；画像永久生长）。
   - **任何图谱结构变更（merge/archive/link/create/attach/update）一律先建议后确认。** Agent 只是把「提议」从「实时对话」扩展到「后台批量」，**确认权永远在用户**。
   - 删除=归档；边随节点迁移；节点=概念+简介；可打断语音；本地优先。
2. **Provider 可替换不动摇。** 业务逻辑只依赖接口（`VoiceProvider` / `LlmProvider` / `NewsSource` / `StorageProvider`），新增的 Agent 能力也必须以**新接口**形式接入，不得让上层直接依赖某个厂商 SDK 或某个云函数实现。
3. **自主性是「带护栏的」**：每一步自主行动都要可观测（日志/轨迹）、可中断、可回滚（图谱变更落库前必经 proposal inbox）。
4. **成本透明。** 真正花钱的是 LLM / STT / TTS 的按量调用，不是「服务器」。编排逻辑优先跑在零成本的本地定时任务或免费 Serverless 上（见 §6）。
5. **增量可发布。** 每个里程碑都能独立 `pnpm check` 通过、独立 demo、独立合并，不憋大招。
6. **记忆边界不可越。** 新增的长期记忆引擎（§5.5）只做**只读召回注入**，**绝不**写图谱/画像（落库永远只走收件箱）；只写**蒸馏纯文本**（原始音频/全文照旧丢弃，守住不变量 1）；记忆引擎走 `MemoryProvider` 接口、本机自部署，守住不变量 5/7。

---

## 2. 三阶段演进总览

| 阶段 | 代号 | 能力跃迁 | 一句话 |
|---|---|---|---|
| **A** | `proactive-ingest` | 从「开机才抓」→ 后台**主动抓取 + 预提炼**，攒成晨间简报 | 它替你盯着 AI 圈 |
| **B** | `research-loop` | 从「单条新闻固定流程」→ 围绕主题的**多步自主研究链**，主动产出成批图谱提议 | 它替你做调研 |
| **C** | `companion-proactivity` | 从「工具」→ 用画像**预判、主动建议**（含主动归档过时知识） | 它真的懂你 |

三个阶段共享同一套**Agent 内核**（§4）与**提议收件箱**（§5），后者是「先建议后确认」从实时扩展到异步的关键载体。

---

## 3. 当前架构基线（演进的地基）

复用并扩展现有模块，避免重写：

- **领域模型** `src/domain/`：`ConceptNode` / `GraphEdge` / `RelationType` / `GraphMutationProposal`（`kind: merge|archive|link|create|attach|update`）/ `UserProfile`。
- **Provider 层** `src/providers/`：
  - `LlmProvider`：`summarizeNews` / `explainConcept` / `proposeGraphMutations` / `distillUserProfile`。
  - `NewsSourceRegistry`：`list()` / `fetchAll()`，已有 `RssNewsSource` + `GitHubTrendingNewsSource`。
  - `VoiceProvider`：`connect/disconnect/interrupt/onTranscript`（可打断已实现）。
- **变更引擎** `src/lib/graphMutations.ts`：纯函数 `applyGraphMutation(snapshot, proposal)` + `persistGraphSnapshot(storage, before, after)` + `migrateEdges`（边迁移已实现）。**这是 Agent 行动的唯一落库通道，必须复用。**
- **存储** `StorageProvider`（`src/storage/types.ts`）：图谱 + 画像读写，better-sqlite3（web-dev）/ Tauri SQL（desktop）双实现。
- **状态** `src/stores/`：`appStore`（启动相位）/ `graphStore` / `profileStore` / `ingestStore`（已有 `pendingProposalQueue` + 先建议后确认流转）/ `manualGraphStore`。
- **编排** `src/lib/runLaunchSequence.ts`：现有「自检→加载→抓取→ready/onboarding」流水线，阶段 A 会在它旁边加一条**后台抓取**支线。

> 关键洞察：现有 `ingestStore.pendingProposalQueue` 已经是「一批待确认提议」的雏形。Agent 化本质上是把**生成提议的来源**从「用户逐条听新闻」扩展到「后台/研究链批量产出」，而**确认与落库通道完全复用**。

---

## 4. Agent 内核：Sense → Plan → Act → Reflect

新增目录 `src/agent/`，定义一套与厂商无关的内核接口。**这是本 RFC 的技术核心。**

```ts
// src/agent/types.ts （目标接口，里程碑 A1 落地）

/** Agent 在一次运行中可执行的原子能力，全部走现有 Provider，禁止旁路。 */
export interface AgentTools {
  fetchNews(): Promise<NewsItem[]>;                 // 复用 NewsSourceRegistry
  summarize(item: NewsItem): Promise<string>;       // 复用 LlmProvider
  explain(topic: string, profile: UserProfile): Promise<string>;
  propose(context: string): Promise<GraphMutationProposal[]>; // 复用 LlmProvider
  readGraph(): Promise<BrainGraphSnapshot>;         // 复用 StorageProvider
  readProfile(): Promise<UserProfile>;
}

/** 一次自主运行的产物——注意：只产出「提议 + 轨迹」，绝不直接落库改图谱。 */
export interface AgentRunResult {
  runId: string;
  startedAt: string;
  finishedAt: string;
  proposals: ProposalEnvelope[];   // 进入提议收件箱，等用户确认（§5）
  digest: AgentDigest | null;      // 晨间简报/研究报告（纯文字，可丢弃）
  trace: AgentTraceStep[];         // 可观测：每一步的输入/输出/耗时/token
}

/** 一个可调度、可中断的自主任务。 */
export interface AgentJob {
  readonly id: string;
  run(tools: AgentTools, signal: AbortSignal): Promise<AgentRunResult>;
}
```

内核约束：
- **唯一落库出口**：`AgentRunResult.proposals` → 提议收件箱 → 用户确认 → `applyGraphMutation` + `persistGraphSnapshot`。Agent 自身**没有**写图谱的能力（编译期就保证：`AgentTools` 不暴露任何写方法）。
- **可中断**：`run(tools, signal)` 必须响应 `AbortSignal`，对齐「可打断」的产品气质。
- **可观测**：`trace` 记录每一步，前端「数据流注入大脑」动画可以复用它做真实可视化。

---

## 5. 提议收件箱（Proposal Inbox）——异步「先建议后确认」的载体

这是把不变量 #3 从「实时对话」安全扩展到「后台自主」的关键设计。

- **新增表（migration）`agent_proposals`：** 持久化 Agent 产出的待确认提议。
  ```
  id TEXT PK
  run_id TEXT            -- 关联哪次 Agent 运行
  created_at TEXT
  kind TEXT              -- merge|archive|link|create|attach|update
  summary TEXT           -- 给用户看的人话说明
  payload JSON           -- 对应 graphMutationPayloads 的结构
  status TEXT            -- pending|approved|rejected|expired
  source TEXT            -- 'voice' | 'background_ingest' | 'research_loop' | 'profile_suggestion'
  ```
- **`StorageProvider` 扩展**（保持接口纯粹、向后兼容）：
  ```ts
  listPendingProposals(): Promise<ProposalEnvelope[]>;
  saveProposal(p: ProposalEnvelope): Promise<void>;
  setProposalStatus(id: string, status: ProposalStatus): Promise<void>;
  ```
- **确认即复用现有路径**：用户在 UI 点「同意」→ 取出 `proposal` → `applyGraphMutation(snapshot, proposal)` → `persistGraphSnapshot(...)` → `setProposalStatus(id, 'approved')`。**零新增落库逻辑，零绕过。**
- **UI**：在大脑星图旁加一个「待办建议」铃铛/抽屉，复用 `SuggestConfirmDialog` 的交互；批量提议支持「逐条确认」（对齐产品「一条条问」的气质）。
- **过期策略**：`pending` 超过 N 天自动 `expired`，避免堆积焦虑。

---

## 5.5 记忆引擎（EverMemOS · B 方案）与 `MemoryProvider`

> 借鉴 **EverOS**（EverCore 三阶段记忆生命周期、HyperMem 分层记忆）与 **OpenHer**（声明式人格、异步两阶段召回）。落地为 **M 系列**里程碑（M0–M3），交付物见 `specs/M*`。

**为什么需要它**：现状的「图谱 + 画像」是**结构化、显式**的永久存储，但缺少**联想式跨会话召回**——「上次我们聊到 X 时你说过 Y」这种能力。记忆引擎补这块，让回答从「每次从零」变成「先回忆、再回答」，越用越像老朋友。

**它在三层记忆里的位置（不新增"用户拥有的大脑"，不破坏不变量）**：
- 层①原始音频/全文 → **照旧丢弃**。
- 层②知识图谱（SQLite）/ 层③用户画像（SQLite）→ **仍是唯一的、用户拥有的权威真源**；先建议后确认、可手动改、可找回，全不变。
- **记忆引擎 = 派生的「联想召回层」**：只吃**蒸馏纯文本**（情节摘要 + 抽取事实，与喂画像同一份蒸馏产物），提供 `recall(query)` 给 LLM 上下文做 grounding。**抹掉记忆引擎，用户的大脑（图谱+画像）毫发无损**——它是助手的"长期记忆"，不是用户资产的载体。

**接口（不变量 5：业务只依赖接口，不依赖厂商）**：
```ts
// src/providers/memory/types.ts （M0 落地）
interface MemoryProvider {
  remember(items: MemoryItem[]): Promise<void>;        // 仅蒸馏纯文本
  recall(q: RecallQuery): Promise<RecalledMemory[]>;   // 只读召回
  health(): Promise<{ ok: boolean; detail?: string }>;
}
```

**实现选型——EverMemOS 采用 B 方案（核心依赖深度集成，已批准）**：
- 默认实现 `everMemOsProvider` 对接 **EverMemOS**（EverCore/HyperMem）REST `http://localhost:1995/api/v1`；mock 实现供测试/离线开发。
- EverCore 三阶段映射：`remember`=情节痕迹形成；语义固结由 EverMemOS 内部完成；`recall`=重构召回。HyperMem 的 topic/event/fact 分层在 **M3** 复用为「由粗到细召回」+ 前端缩放粒度。
- **依赖例外（显式记录）**：B 方案引入本机 **Python 3.12 + Docker** sidecar，是对 AGENTS.md「锁定栈 / 不随意加依赖」的**已批准例外**（同 G1 的 three.js 例外）。理由：长期记忆是 EverOS 的核心壁垒能力，自研性价比低；用接口隔离厂商，风险可控。
- **边界由 rule + hook 强制**：EverMemOS REST/SDK **仅**允许出现在 `src/providers/memory/` 适配器内；记忆模块禁止 `applyGraphMutation`/`persistGraphSnapshot`/写 `StorageProvider`。见 `.cursor/rules/memory-boundary.mdc` 与 `.cursor/hooks/memory-boundary.mjs`。

---

## 6. 调度与运行环境（先零成本，后按需）

对应用户最关心的「要不要买服务器」——**先不用**。

| 档位 | 方案 | 成本 | 触发 | 适用阶段 |
|---|---|---|---|---|
| L0 | **开机即抓**（现状，`runLaunchSequence`） | 0 | 应用启动 | 一直保留 |
| L1 | **本机定时任务**：Tauri 后台 + 系统计划任务 / cron | 0 | 本机开机时定时 | 阶段 A 默认 |
| L2 | **免费 Serverless 定时**：GitHub Actions `schedule` cron（或 Cloudflare Workers Cron） | ≈0 | 云端定时，产物（提议+简报 JSON）回推仓库/对象存储，开机同步 | 阶段 A 进阶 / B |
| L3 | **最便宜 VPS / 容器** 7×24 | 几~几十元/月 | 真要全天候 | 后续，非现在 |

设计要求：**调度器只是 `AgentJob.run` 的触发器**，内核与运行环境解耦。同一个 `AgentJob` 在 L1（本机）和 L2（GitHub Actions）上跑出的结果格式完全一致（都进提议收件箱）。

**记忆引擎运行档（M 系列，B 方案）**：EverMemOS 作为**本机 Docker sidecar**（`docker compose up -d`，REST @ `localhost:1995`）。前置要求：本机 Python 3.12 + Docker。桌面端（Tauri）负责健康探测与**优雅降级**——sidecar 未起时 `recall→[]`、应用照常可用（只是回答不带记忆 grounding），**绝不崩溃**。密钥/Base URL 走 `.env`（gitignored）。L2/L3 远端编排若需召回，连本机或后续云端 EverMemOS，仍只经 `MemoryProvider`。

> 成本红线提醒：无论编排在哪，LLM/语音 API 都是按量计费。阶段 A 起就要做 **token 预算护栏**（每次 run 上限 + 每日上限 + 失败重试退避），写进 `AgentJob` 配置。

---

## 7. 里程碑拆解（每个里程碑 = 一个可合并 PR）

### 阶段 A — `proactive-ingest`（替你盯着 AI 圈）

- **A1 内核骨架**：建 `src/agent/{types,tools,runner}.ts`；实现 `AgentTools`（全部委托现有 Provider）；纯函数 + 单测（mock provider），不接 UI。
  - 验收：`pnpm check` 通过；给定 mock 新闻，`runner` 产出 `AgentRunResult`，proposals 非空且不触碰存储写。
- **A2 提议收件箱**：`agent_proposals` migration + `StorageProvider` 三个新方法（better-sqlite3 与 Tauri SQL 双实现）+ `proposalStore`。
  - 验收：写入/读取/改状态有单测；`approved` 后经 `applyGraphMutation` 落库与手动路径结果一致（复用 `graphMutations.test.ts` 模式）。
- **A3 后台抓取 Job**：`MorningBriefJob` —— 抓取→去重（与现有图谱标题/来源比对）→对 Top-N 调 `summarize`+`propose`→写收件箱 + 生成 `digest`。带 token 预算护栏。
  - 验收：mock 下产出晨间简报 + 一批 pending 提议；预算超限会优雅截断。
- **A4 收件箱 UI**：星图旁「待办建议」抽屉 + 晨间简报卡片，复用 `SuggestConfirmDialog`，逐条确认。
  - 验收：浏览器端跑通「后台产提议→用户逐条确认→星图新增节点」闭环（用 AI 截图反馈闭环验收，见 §9）。
- **A5 本机调度（L1）**：应用空闲时定时触发 `MorningBriefJob`；可在设置里开关与设频率。
  - 验收：到点自动产出简报且可中断；关闭后不触发。

### 阶段 B — `research-loop`（替你做调研）

- **B1 多步研究 Job**：`TopicResearchJob(topic)` —— 跨多源搜集→交叉去重→`LlmProvider` 提炼概念→产出**成批关联提议**（create + link + 必要时 merge/archive），全程写 `trace`。
- **B2 LlmProvider 扩展**：新增 `planResearch(topic, profile)` 与 `synthesizeConcepts(evidence[])`，仍是接口方法，mock + openai 双实现。
- **B3 研究报告视图**：把 `trace` 渲染成可读的「调研轨迹」，并把关联提议在星图上**预览高亮**（确认前先看影响范围）。
- B 阶段同样**只产提议**，落库仍走收件箱 + `applyGraphMutation`。

### 阶段 C — `companion-proactivity`（真的懂你）

- **C1 画像驱动选题**：`MorningBriefJob` 用 `UserProfile.interests/knownTopics/unknownTopics` 给候选资讯打分排序，讲解深度按 `explanationStyle` 自适应。
- **C2 主动净化建议**：定期扫描图谱，对「可能过时/有更优解」的节点生成 `archive`（带 `migrateEdgesToNodeId`）提议进收件箱——**主动提议，绝不自动归档**。
- **C3 画像生长闭环**：每次语音会话结束 `distillUserProfile` 已有；补上「Agent 运行也反哺画像」（如用户连续 reject 某类提议→降低该方向权重）。
- **C4 Persona 引擎精简版**：把人格预设升级为**声明式预设**（仿 OpenHer `SOUL.md`，描述讲解风格参数）+ **feel-first 两段式**（先内部判断口吻/深度→再塑形表达）。**刹车**：只调表达风格，不做情绪热力学/恋爱陪伴；事实内容与「先建议后确认」不受影响。见 `specs/C4-persona-engine.md`。

### 记忆引擎里程碑（M 系列，跨 A 末 → B → C，详见 `specs/M*`）

- **M0 MemoryProvider + EverMemOS sidecar（B 方案地基）**：接口 + EverMemOS 适配器 + mock + sidecar 生命周期/优雅降级。排在 **A 段收尾、B1 之前**（重基建，先把 A4/A5/G1 这些无重依赖能力做稳）。
- **M1 召回式 grounding**：`summarize`/`explain`/`propose`/语音应答前 `recall` 注入（80/20 混合），会话末回写蒸馏记忆。**H3** 评测起步跟随。
- **M3 分层 coarse-to-fine 检索**：HyperMem 风格 topic→concept→fact 由粗到细召回，层级复用为前端缩放粒度（与 N3/G1 对齐）。B 段、配合研究链。
- **M2 显著度 + 衰减**：节点/画像/记忆 salience + 时间衰减，**只产信号**，喂 **C2** 主动归档（仍先建议后确认，绝不自动删）。C 段、C2 之前。

> 评测（硬化）：**H3 记忆质量 & 自进化 eval**（`specs/H3-memory-eval.md`）——召回 recall@k + 成长曲线非降，mock+固定语料、确定性、会红灯。起步跟 M1，加强跟 C3。

---

## 8. 数据流（阶段 A 闭环示意）

```
[调度器 L1/L2] 触发
   → AgentRunner.run(MorningBriefJob, tools, signal)
       → tools.fetchNews()         (NewsSourceRegistry.fetchAll)
       → 去重 vs 现有 graph
       → memory.recall(主题)       (M1：只读召回，注入 grounding 上下文；sidecar 不可用则 [])
       → tools.summarize / tools.propose  (LlmProvider, 带记忆上下文 + token 预算)
       → 产出 AgentRunResult { proposals[], digest, trace[] }
       → memory.remember(蒸馏情节/事实)  (M1：会话/运行末回写，仅蒸馏纯文本)
   → storage.saveProposal(...)      (写 agent_proposals, status=pending)
─────────────────────（异步边界：到此 Agent 不碰图谱）─────────────────────
[用户某次打开 App]
   → 收件箱抽屉展示 pending 提议 + 晨间简报
   → 用户逐条「同意/拒绝」
       同意 → applyGraphMutation → persistGraphSnapshot → setProposalStatus(approved)
       拒绝 → setProposalStatus(rejected)（可反哺画像权重）
   → 星图新增/更新节点，第一性原理：用户始终是大脑的主人
```

---

## 9. 验收与测试策略

- **单元/不变量测试**：复用现有 `*.test.ts` 风格与 `src/invariants/productInvariants.test.ts`。新增不变量测试：**「Agent 任何运行都不得直接写图谱/画像」**（断言 `AgentTools` 类型上无写方法 + runner 不持有 `StorageProvider` 写句柄）。
- **收件箱一致性测试**：`approved` 路径产出的快照 === 手动 `applyGraphMutation` 产出，保证零行为分叉。
- **端到端 AI 验收（呼应你之前的需求）**：用浏览器自动化跑 `pnpm dev`，截图「收件箱→确认→星图变化」，与 `DESIGN.md` 做视觉对比的截图反馈闭环。
- **成本回归**：每个 Job 跑一次的 token 计入 `trace`，CI 里对 mock 统计上限做断言，防止提示词膨胀偷偷涨成本。
- **命令**：沿用 `pnpm lint` / `pnpm check`（pre-commit / pre-push 已挂 Husky）。

---

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| Agent 自动改图谱、破坏「用户所有权」 | 类型层禁止写能力；唯一出口是提议收件箱；加不变量测试 |
| 提议堆积造成确认疲劳 | 逐条确认 + 画像打分排序 + 过期自动清理 + 每日提议数上限 |
| LLM 成本失控 | 每 run / 每日 token 预算护栏 + 退避重试 + mock 优先开发 |
| 后台抓取与 `runLaunchSequence` 竞态/重复 | 抓取去重 key（来源 URL）+ Job 幂等 + 运行锁（类似现有 `launchStarted` 守卫） |
| Serverless 与本机产物格式漂移 | 统一 `AgentRunResult` schema + 版本号 + 解析校验（仿 `graphMutationPayloads` 的 `read*Payload`） |
| 厂商锁定 | 一切新能力走接口；`planResearch` 等仍是 `LlmProvider` 方法，mock/openai 双实现 |
| 记忆引擎写入原始音频/全文，破坏不变量 1 | `remember` 只收蒸馏文本；rule + hook + 不变量测试三重守护 |
| EverMemOS 记忆模块旁路去写图谱/画像 | `memory-boundary` rule/hook 禁 `applyGraphMutation`/`persistGraphSnapshot`/`StorageProvider` 写出现在 `src/providers/memory/**` |
| Docker sidecar 拉不起/桌面端没装 | 全链路优雅降级（`recall→[]`，应用照常可用）；安装步骤进运行档；密钥走 `.env` |
| EverMemOS 厂商锁定 | 业务只依赖 `MemoryProvider`；REST/SDK 仅在适配器内；切 mock/其他引擎零改业务 |
| Persona 蔓延成情感 AI | C4 §非目标明确刹车：只调表达风格，不做情绪机制；事实与确认流不变 |

---

## 11. 立即可做的第一步

> 实现顺序严格按里程碑，先 **A1 内核骨架**（纯函数 + mock 单测，零 UI、零存储写），它是后面所有阶段的地基且风险最低。

```
建 src/agent/types.ts + src/agent/tools.ts + src/agent/runner.ts
  └ AgentTools 委托现有 Provider，AgentRunResult 只产 proposals/digest/trace
  └ src/agent/runner.test.ts：mock provider → 断言产出提议且不触碰存储写
```

完成 A1 并 `pnpm check` 通过后，再进入 A2（提议收件箱）。
