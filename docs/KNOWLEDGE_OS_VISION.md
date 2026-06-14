> **M0 修订（2026-06-13）· 状态：merged**  
> **移动 App-only / User Evolution-first** 以 [`docs/MOBILE_PRODUCT_PLAN.md`](./MOBILE_PRODUCT_PLAN.md) 与 [`specs/mobile-app/`](../specs/mobile-app/) 为准。  
> iOS/Android App 为第一产品入口；桌面/Web/Tauri 为 legacy dev surface。主场景为 **LivingBrainHome + 冷启动对话 + AdaptiveRadar**，非固定 AI 资讯仪表盘。

# my_brain 长期产品蓝图：个人知识操作系统

## 最终愿景

my_brain 的最终形态不是新闻 App、不是 RAG 知识库、也不是普通聊天机器人，而是：

> 一个会陪你成长、会整理世界信息、也会整理你自己的个人知识操作系统。

它每天观察外部世界的信息流，也观察你的学习、项目、兴趣和理解变化。它把“今天发生了什么”转化成“对你长期有用的认知资产”，并沉淀到一张可演化、可回顾、可行动的个人大脑星图里。

第一版不追求泛化用户，也不追求商业化。默认第一使用者就是项目主人自己，以及 GitHub 上能理解这个愿景的开发者。设计原则是：长期大愿景，短期窄闭环。

## 对本蓝图的审查与修正

这份蓝图的愿景是对的，但原版还有几个不足：

- **太像愿景稿，不够像建造蓝图**：描述了最终形态，但没有清楚说明如何从现有 `ConversationConductor`、`autoCurate`、`graphHistoryStore` 等模块一步步长出来。
- **“知识操作系统”容易失控**：如果不设边界，它会膨胀成 Notion、RSS 阅读器、任务管理器、RAG 聊天、写作工具的大杂烩。
- **缺少信任模型**：当 AI 可以观察世界、整理图谱、生成行动建议时，必须明确哪些能自动做、哪些只能建议、哪些必须用户确认。
- **缺少评测方法**：雷达推荐是否相关、自动整理是否正确、画像是否真的懂你、行动建议是否有价值，都需要可验证。
- **数据模型扩展过快**：`Concept`、`Project`、`Question`、`Decision`、`Skill` 都有价值，但一次性引入会让 schema 和 UI 变复杂。
- **隐私和安全还没有成为主线**：个人知识 OS 一旦长期使用，最重要的不是功能数量，而是用户能不能信任它。

修正原则：

- 先把 my_brain 做成 **AI/开源技术方向的个人认知 OS**，不要一开始泛化到所有知识工作。
- 每个阶段只新增一个核心对象或一条核心闭环。
- AI 可以自动筛选、排序、整理已确认知识；但**不能自动污染永久图谱，不能自动执行现实行动**。
- 每个智能能力都要有 mock fixture、评测集和人工可解释理由。
- 每个阶段都必须能转成独立 spec：有固定输入、明确操作、可观测输出、自动化断言、失败条件和回归命令。

## 产品核心

一句话定位：

> Voice-first personal knowledge OS for turning world changes into long-term cognitive assets.

中文定位：

> 一个语音优先的个人知识操作系统，把外部世界的变化整理成你的长期认知资产。

它由四个系统组成：

- **AI 信息雷达**：发现外部世界里值得你知道的变化，尤其是 AI、GitHub、开源项目、技术趋势。
- **语音成长伴侣**：用你听得懂的方式讲解、追问、复习、打断、陪你思考。
- **个人知识图谱**：把重要内容沉淀为概念、关系、来源、历史演化，而不是存碎片。
- **认知操作层**：从图谱生成复习、总结、路线图、面试问答、项目 issue、博客草稿和行动建议。

## 绝对不变量

这些规则不应随着功能扩张被破坏：

- **世界信息不等于你的知识**：外部信息先进入雷达，只有被筛选、讲解、确认或明显关联后，才成为你的长期资产。
- **新建知识必须有用户意图**：AI 可以建议、讲解、追问，但不能随便把新概念写进永久图谱。
- **整理可以自动，但必须可解释、可撤销**：merge/link/archive 自动执行，但要有 reason、history、undo。
- **原始材料短暂，认知资产长期**：音频、全文、临时上下文不长期保存；概念、关系、来源、画像、学习轨迹长期保存。
- **本地优先，Provider 可换**：OpenAI、豆包、通义、讯飞、Qwen 等都只是 provider；产品核心不能绑定厂商。
- **语音是灵魂，但不能 voice-only**：语音优先，文字、静音、回看、导出必须存在。
- **行动建议不等于自动行动**：系统可以生成 issue、博客草稿、学习路线，但提交、发布、删除、联网写操作必须由用户确认。
- **相关度必须可解释**：雷达推荐不能只说“AI 认为重要”，必须说明它和你的图谱、项目、兴趣或历史问题有什么关系。
- **长期画像必须可查看和修正**：既然画像会影响推荐和讲解，用户必须能看到“系统以为我懂什么/喜欢什么”，并能修正。

## 信任与权限模型

把系统权限分成四级，避免“AI OS”变成不可控黑盒：

- **Read**：读取已确认图谱、画像、来源链接、历史记录。Brain MCP 默认只允许这一级。
- **Suggest**：提出入库候选、整理理由、学习路线、项目 issue、博客草稿。
- **Auto-organize**：对已入库内容自动 link/merge/archive，但必须记录 reason、history、undo。
- **User-confirmed write**：新建永久知识、执行外部写操作、发布内容、修改重要画像，需要用户确认。

默认策略：

- 世界信息进入 `WorldItem`，不是永久知识。
- 雷达可以自动排序 `WorldItem`。
- 伴侣可以自动讲解 `BriefingItem`。
- 新建 `KnowledgeNode` 需要用户意图。
- 自动整理已确认图谱可以自动执行，但必须可撤销。
- 行动层只能生成建议，不能自动替你发 issue、发文章、改代码。

## 总体架构

```mermaid
flowchart TD
  worldSources[WorldSources] --> radar[InformationRadar]
  radar --> relevance[PersonalRelevanceScoring]
  relevance --> briefing[DailyBriefing]
  briefing --> companion[VoiceCompanion]
  companion --> choice{UserIntent}
  choice -->|"入库"| ingest[ConfirmedIngest]
  choice -->|"讲细点"| teaching[PersonalizedTeaching]
  choice -->|"不要"| discard[EphemeralDiscard]
  teaching --> choice
  ingest --> graph[KnowledgeGraph]
  graph --> curation[AutoCuration]
  curation --> history[GraphHistoryUndo]
  graph --> recall[PersonalRecall]
  recall --> companion
  graph --> actions[CognitiveActions]
  actions --> review[WeeklyBrainReview]
  actions --> interview[InterviewMode]
  actions --> projectOps[ProjectRoadmapIssues]
```

## 与当前代码的映射

长期蓝图不是重写项目，而是在现有骨架上生长：

- `src/conversation/ConversationConductor.ts`：继续作为语音伴侣和用户意图状态机的中心。
- `src/conversation/ingestActions.ts`：继续作为“用户确认入库”的唯一主出口。
- `src/agent/curation/autoCurate.ts` 与 `src/lib/runAutoCuratePipeline.ts`：扩展为长期图谱整理管线，增加 reason code、provenance、评测。
- `src/stores/graphHistoryStore.ts`：从 undo 栈扩展为“认知变更历史”，支撑 weekly review 和审计。
- `src/lib/graphContextPack.ts`：继续负责把图谱压缩进 LLM 上下文，后续加入 RadarSignal 和 LearningTrace。
- `src/providers/**`：保持 OpenAI/国内模型/Mock 可替换；新增 Provider 不应进入业务核心。
- `src/mcp/**`：继续作为外部 agent 只读查询入口，不能绕过入库门控。

需要新增但不急于一次完成：

- `src/domain/radar.ts`：`WorldItem`、`RadarSignal`、`BriefingItem`。
- `src/radar/`：信息抓取、去重、相关度评分、每日简报选择。
- `src/domain/learning.ts`：`LearningTrace`、理解程度、复习信号。
- `src/actions/` 或 `src/cognitive/`：Weekly Review、Interview Mode、Project Mode、Writing Mode 的生成逻辑。
- `docs/evals/`：雷达、整理、画像、行动建议的评测集说明。

## Spec 与 Harness 验收协议

这份蓝图后续会拆成多个可执行 spec。每个 spec 必须遵守同一套 harness 协议，避免“看起来完成了，但无法验证”。

每个 spec 必须包含：

- **Scope**：本 spec 只做什么，不做什么。
- **Input fixtures**：固定输入数据，例如 demo graph、world items、profile、conversation transcript。
- **User actions**：用户或测试 harness 触发的动作，例如启动、选择入库、点击 undo、请求 weekly review。
- **Expected observations**：UI、store、storage、voice transcript、graph history 中必须能观察到什么。
- **Assertions**：Vitest/E2E/invariant/visual snapshot 的明确断言。
- **Forbidden behaviors**：禁止静默新建节点、禁止外部 agent 写图谱、禁止行动层自动发布等。
- **Failure recovery**：API key 缺失、新闻源失败、语音不可用时的降级路径。
- **Verification command**：最小验证命令，例如 `pnpm test -- ...`、`pnpm check`、`pnpm visual:loop --companion`。

推荐 Given/When/Then 模板：

```text
Given:
- 初始图谱包含哪些节点和边
- 用户画像包含哪些兴趣和理解程度
- 外部信息源返回哪些 WorldItem

When:
- 用户执行什么动作
- 系统调用哪个核心函数或进入哪个流程

Then:
- UI 显示什么
- store/storage 发生什么变化
- graph history 记录什么
- 哪些权限边界没有被破坏
```

Harness 输出也要稳定：

- 每个新 evaluator 返回 `{ status, summary, artifacts, next_actions }` 形状。
- 错误必须包含 root cause hint、safe retry instruction、stop condition。
- 高风险能力用小工具/小函数验证，不用一个大黑盒测试覆盖所有东西。
- fixture 必须 deterministic，不能依赖实时网络结果才能通过。

全局质量门：

- 新增长期写图谱路径时，必须更新不变量测试。
- 新增 provider 时，必须有 mock parity test。
- 新增数据模型时，必须有迁移/序列化/导出策略。
- 新增 UI 关键状态时，必须有至少一个行为测试或视觉快照。
- 新增 AI 生成能力时，必须有 fixture eval 或 golden snapshot。

## 阶段路线

### Stage 1: 作品级核心闭环

目标：先做出一个稳定、好看、能讲清楚的 3 分钟体验。

用户体验：

- 打开应用，伴侣自检上线。
- 它主动讲 3 条 AI/GitHub 趋势。
- 你说“入库 / 不要 / 讲细点”。
- 入库后星图点亮。
- AI 自动连线、合并或归档。
- 你能看到整理原因，也能撤销。

这一步的价值是让 GitHub 访问者和面试官立刻理解：这不是聊天壳，而是一个有写入边界、有图谱演化、有长期记忆意识的系统。

### Stage 2: AI 信息雷达

目标：让它真正开始“观察世界”。

能力：

- 抓取 AI 新闻、GitHub trending、特定 repo release、论文/博客/RSS。
- 不只是按热度排序，而是按“与你的图谱和兴趣相关度”排序。
- 对每条信息给出判断：为什么值得看、和你已有知识有什么关系、是否值得入库。
- 每天生成“今日 3 条最值得你知道的变化”。

关键设计：

- `WorldItem`：外部信息单位，短暂保存，可丢弃。
- `RadarSignal`：为什么它和你相关，例如 repo 相似、概念重合、趋势异常。
- `BriefingItem`：被选入每日简报的信息。
- `IngestCandidate`：可能进入知识图谱的概念候选。

借鉴 GitHub 项目时，不是收藏 repo，而是问：这个 repo 对我的认知图谱有什么增量？

验收标准：

- 每天能从固定 mock source 和至少一个真实 source 生成候选。
- 每条候选都有可解释的 `RadarSignal`。
- 简报只选 3 条，避免信息过载。
- 用户能看到“为什么它和我有关”。
- 误判可以反馈：不感兴趣、太浅、太深、已知道。

### Stage 3: 个人成长伴侣

目标：让它不只是讲资讯，而是越来越懂你的理解水平。

能力：

- 知道你熟悉哪些概念、不熟悉哪些概念。
- 记录你喜欢的讲解方式：比喻优先、源码优先、架构图优先、面试回答优先。
- 发现重复问题，主动补课。
- 根据图谱生成复习路径。
- 支持“讲给我听”“考考我”“帮我准备面试”“用我的项目举例解释”。

核心体验：

- “你上周入库了 Graphiti，但还没把它和 my_brain 的 auto-curate 对上，我今天给你串一下。”
- “你已经懂 Provider 抽象了，所以这次我不讲基础，直接讲实时语音 provider 的难点。”
- “我给你出一道面试题：为什么你的项目不用普通 RAG？”

验收标准：

- 系统能区分至少三类理解状态：未接触、听过、能解释。
- 同一概念二次讲解时，不重复第一次的浅层解释。
- 画像变更可查看、可撤销或可修正。
- 面试模式能基于图谱生成问题，而不是固定模板。

### Stage 4: 个人知识图谱进化

目标：从“概念星图”升级成“长期认知资产图谱”。

图谱节点类型可以逐步扩展，但不要一开始泛滥：

- `Concept`：概念，例如 Realtime API、Graphiti、Barge-in。
- `Project`：项目，例如 my_brain、AnythingLLM、Thoth。
- `Source`：来源链接，例如 GitHub repo、文章、release。
- `Question`：你反复问的问题。
- `Decision`：你在项目里做过的重要取舍。
- `Skill`：你掌握或正在掌握的能力。

扩展顺序建议：

1. 先保持 `Concept` 为主。
2. 再加入 `Project`，因为 GitHub 项目和你的 my_brain 关联最强。
3. 再加入 `Decision`，用于记录项目中的重要技术取舍。
4. 最后加入 `Question` 和 `Skill`，支撑学习与面试。

不要一次性把所有节点类型塞进 UI。第一阶段可以在数据层支持，UI 仍然只显示简洁星图。

关系类型保持少而强：

- `relates_to`
- `depends_on`
- `replaces`
- `inspired_by`
- `explains`
- `used_in`
- `learned_from`

图谱不只是展示，还要能回答：

- 我最近真正关心什么？
- 哪些概念正在变重要？
- 哪些知识已经过时？
- 我的项目下一步最应该补什么？
- 我能不能把这些内容讲给别人听？

验收标准：

- 每个长期节点至少有 title、intro、sourceRefs、updatedAt。
- 每次 merge/archive/link 都有 reason。
- 一次错误整理可以被 undo。
- Weekly Brain Review 能解释本周图谱发生了哪些结构变化。

### Stage 5: 认知操作层

目标：让图谱产生行动，而不是只保存知识。

能力：

- **Weekly Brain Review**：每周总结你的知识增长、热点、薄弱点、下一步建议。
- **Interview Mode**：根据图谱生成面试讲稿、追问、架构解释、项目难点。
- **Project Mode**：根据图谱和外部趋势生成项目 issue、roadmap、技术债建议。
- **Writing Mode**：把图谱路径转成博客、README、技术分享稿。
- **Research Mode**：沿着某个节点继续追踪外部信息。

示例：

- “你这周新增了 12 个 AI voice 相关概念，其中 5 个都指向实时打断。建议下周优先补 Provider Strategy。”
- “我发现 Filegraph 的 voice overlay 很适合你，可以生成一个 issue：改进 my_brain demo 引导。”
- “把我们最近研究的 Graphiti、Thoth、AnythingLLM 整理成一篇技术博客。”

权限边界：

- 可以生成 issue 草稿，但不自动创建 GitHub issue，除非用户确认。
- 可以生成博客草稿，但不自动发布。
- 可以生成学习路线，但不自动改你的长期目标。
- 可以建议归档旧概念，但新建长期节点仍需用户意图。

验收标准：

- Weekly Brain Review 能稳定生成。
- Interview Mode 至少能围绕 my_brain 生成 5 个高质量追问。
- Project Mode 的建议必须引用图谱节点或外部来源，不能空泛。

### Stage 6: 开源生态与 Agent 接入

目标：让 my_brain 不只是一个 App，而是一个可被其他工具读取的本地认知底座。

能力：

- 继续保持 Brain MCP 只读查询。
- 允许 Cursor/Claude/Codex 等 agent 查询你的已确认知识图谱。
- 提供导出：Markdown、JSON、Graph snapshot。
- 支持本地插件：NewsSource、LlmProvider、VoiceProvider、EmbeddingProvider。
- 保持写入边界：外部 agent 默认只能读，不能绕过用户确认写入图谱。

这会让项目在 GitHub 上更有特色：它不是封闭 App，而是一个 local-first personal knowledge substrate。

验收标准：

- Brain MCP 只读边界有测试。
- 导出格式能被其他工具读取。
- Provider 插件规范有最小示例。
- README 明确哪些 agent 能读，哪些写操作被禁止。

## 桌面/Web 第一入口

第一入口保持：桌面/Web 主应用。

理由：

- 星图需要大屏，桌面最有沉浸感。
- Web 方便 GitHub 访问者体验。
- Tauri 桌面适合 local-first、SQLite、系统音频、未来凭据存储。
- 移动端后续可以做 companion capture，不要现在分散主线。

界面结构继续保持克制：

- 中央/全屏：大脑星图。
- 右侧或浮层：语音光球。
- 角落：设置、provider、demo mode。
- 临时浮层：简报、整理报告、weekly review。

不要回到多页面 dashboard。个人知识操作系统的感觉应该是“一个活的大脑”，不是“很多管理后台页面”。

## 评测体系

长期产品要避免“AI 看起来很聪明，但其实不可验证”。建议从一开始就保留评测意识：

- **Radar relevance eval**：给定用户图谱和 20 条外部信息，检查系统是否把真正相关的排进前 3。
- **Ingest quality eval**：检查入库候选是否是概念而不是新闻碎片。
- **Curation eval**：检查 merge/link/archive 是否符合预期，错误时能否 undo。
- **Profile growth eval**：检查用户多次反馈后，推荐和讲解深度是否变化。
- **Action usefulness eval**：检查 Weekly Review、Interview Mode、Project Mode 是否引用真实节点和来源。

这些评测不需要一开始很复杂，可以先用 fixture + snapshot + 人工 goldens。重点是让项目展示出“我知道怎么判断 AI 功能有没有变好”。

## 关键数据模型

长期建议形成这些核心模型：

- `WorldItem`：外部世界的一条信息，短期存在。
- `RadarSignal`：为什么这条信息与你有关。
- `BriefingItem`：进入每日讲解的信息。
- `KnowledgeNode`：长期知识节点。
- `KnowledgeEdge`：长期关系。
- `SourceRef`：来源链接和 provenance。
- `GraphChange`：自动整理历史，支持 undo。
- `UserProfileSignal`：兴趣、理解程度、讲解偏好。
- `LearningTrace`：你什么时候听过、追问过、复习过某概念。
- `CognitiveAction`：由图谱生成的行动建议、issue、文章、面试题。

数据生命周期：

- `WorldItem`：短期，可过期，可重新抓取。
- `BriefingItem`：会话级，可记录摘要，但不等于长期知识。
- `KnowledgeNode` / `KnowledgeEdge`：长期，必须可导出、可迁移、可撤销结构变更。
- `UserProfileSignal`：长期，但必须可查看、可修正。
- `LearningTrace`：中长期，用于复习和成长分析。
- 原始音频和全文：默认不长期持久化。

## 成熟度标志

这个产品什么时候算“开始成形”？

- 它每天能稳定给你 3 条“真的和你有关”的变化。
- 你愿意对其中至少 1 条说“入库”。
- 一个月后，你能从星图里看到自己关注点的变化。
- 它能帮你讲清楚自己的项目，而不是只复述文档。
- 它能根据外部趋势反过来建议你的项目下一步。

这个产品什么时候算“真正强”？

- 它比你更早发现某个技术趋势和你项目有关。
- 它能把三个月前的知识重新拿出来，和今天的新信息连接。
- 它能帮你生成高质量的面试回答、博客、roadmap。
- 它能成为其他 AI agent 的只读长期记忆底座。

反向失败信号：

- 它每天推很多东西，但你不想入库任何一条。
- 星图越来越乱，用户不敢信任自动整理。
- 画像变得武断，讲解越来越不符合你。
- 行动建议像模板，没有引用你的真实图谱。
- README 很宏大，但 demo 仍然跑不出第一颗星。

## 近期执行切口

不要一口气做完整 OS。近期切口仍然是：

> AI 信息雷达 + 语音入库 + 自动整理 + 每周脑图回顾。

这是最小版本，但已经包含长期愿景的全部 DNA：

- 世界信息进入。
- 伴侣讲给你听。
- 你决定是否变成知识。
- 系统自动整理。
- 长期图谱产生回顾和行动。

近期顺序要非常保守：

1. 先完成 Showcase OS Seed，证明体验成立。
2. 再做 Radar MVP，证明外部信息能被筛选。
3. 再做 Weekly Brain Review，证明图谱能反过来产生价值。
4. 再做 Interview Mode，因为它最适合 GitHub/面试展示。
5. 最后再扩 Project/Writing/Research Mode。

## 不做什么

短期不做：

- 手机 App。
- 多用户系统。
- 云同步。
- 全品类信息管理。
- 复杂图数据库迁移。
- 过度插件市场。
- 自动写入一切信息。

长期也要谨慎：

- 不要变成另一个 Notion。
- 不要变成信息收藏夹。
- 不要变成普通 RAG 聊天框。
- 不要让 AI 绕过用户意图污染长期图谱。
- 不要为了炫酷牺牲可解释和可撤销。
- 不要把所有外部信息都存进永久库。
- 不要一开始支持所有内容类型。先专注 AI/GitHub/开源技术。
- 不要把行动层做成自动执行 agent。先做建议和草稿。

## 推荐里程碑

### Milestone A: Showcase OS Seed

完成作品级演示，证明形态成立。

交付：README、DEMO、ARCHITECTURE、稳定 demo mode、短视频、3 分钟核心闭环。

Definition of Done：

- **Fixture**：固定 demo graph、3 条 briefing items、1 条可入库概念、1 条确定性 auto-curate 结果。
- **Flow assertion**：启动 → 自检 → 简报 → “入库” → 新节点出现 → 自动整理记录 → undo 恢复，全流程无 API key 可跑通。
- **State assertion**：`graphStore` 新增节点；`graphHistoryStore` 新增 before/after；undo 后节点/边回到 before。
- **Boundary assertion**：新建节点只能由用户确认触发；mock 简报不能绕过 ingest gate 直接写图谱。
- **UI assertion**：用户能看到入库成功、整理原因、undo 入口、mock/live 状态。
- **Docs assertion**：README/DEMO/ARCHITECTURE 清楚说明 mock/live 边界和 3 分钟复现步骤。
- **Verification**：`pnpm check` 通过；核心 demo 有行为测试或 e2e mock smoke；视觉主界面快照不明显回退。

### Milestone B: Radar MVP

完成 AI/GitHub 信息雷达。

交付：WorldItem、RadarSignal、Daily Briefing、个性化排序、来源链接。

Definition of Done：

- **Fixture**：至少 20 条 `WorldItem`，包含明显相关、弱相关、无关、重复、过时五类。
- **Source assertion**：一个 fixture source 稳定返回；一个真实 source 失败时系统降级但不阻塞 demo。
- **Ranking assertion**：给定固定 graph/profile，top 3 必须包含 goldens 标注的相关项，且不得包含无关项。
- **Explainability assertion**：每个入选 `BriefingItem` 至少有 1 条 `RadarSignal`，说明与图谱/项目/兴趣的关系。
- **Feedback assertion**：用户标记“不感兴趣/已知道/太浅/太深”后，下一次排序或讲解深度发生可测试变化。
- **Boundary assertion**：`WorldItem` 不等于 `KnowledgeNode`；雷达排序不能直接写永久图谱。
- **Verification**：新增 radar fixture eval；相关度排序测试；source failure recovery 测试。

### Milestone C: Growth Companion

完成画像驱动讲解和复习。

交付：理解程度、讲解偏好、追问记录、复习提醒、Interview Mode 初版。

Definition of Done：

- **Fixture**：同一概念配三种 profile：未接触、听过、能解释。
- **Teaching assertion**：三种 profile 产生不同讲解深度；“能解释”状态不得重复基础定义。
- **Trace assertion**：用户追问、跳过、入库、复习会形成 `LearningTrace` 或等价信号。
- **Profile assertion**：画像变更可查看、可修正；修正后下一轮讲解/推荐使用新画像。
- **Interview assertion**：Interview Mode 基于当前图谱生成至少 5 个项目相关追问，且每个问题引用节点或设计决策。
- **Boundary assertion**：画像蒸馏不能直接写图谱；用户画像不能被不可见地永久锁死。
- **Verification**：profile growth eval；teaching-depth snapshot；interview question golden 测试。

### Milestone D: Cognitive Graph

完成更强的图谱演化。

交付：provenance、reason code、graph history UI、weekly brain review、concept evolution。

Definition of Done：

- **Fixture**：含重复概念、替代关系、过时节点、来源链接的 graph snapshot。
- **Schema assertion**：长期节点包含 `title`、`intro`、`sourceRefs`、`updatedAt` 或等价字段。
- **Mutation assertion**：merge/link/archive 都记录 reason code、before/after、affected nodes/edges。
- **Undo assertion**：任一结构变化可以回滚，边迁移也能恢复。
- **Provenance assertion**：Weekly Review 引用真实 `GraphChange` / graph history，不凭空总结。
- **Boundary assertion**：archive 不能 hard-delete；merge 后边关系不能丢失。
- **Verification**：graph mutation unit tests；history undo tests；weekly review fixture golden。

### Milestone E: Action OS

让图谱产生行动。

交付：项目 issue 建议、博客草稿、学习路线、面试问答、research follow-up。

Definition of Done：

- **Fixture**：一张包含项目、概念、决策、来源的 graph；一组 recent graph changes。
- **Weekly assertion**：Weekly Brain Review 包含新增、合并、归档、薄弱点、下一步建议。
- **Interview assertion**：面试回答/追问引用真实节点、来源或项目决策，不能是泛模板。
- **Project assertion**：项目建议必须包含 linked nodes、reason、expected impact、suggested next step。
- **Draft-only assertion**：issue、博客、roadmap 都只生成草稿，不自动发布、不自动写外部系统。
- **UI/docs assertion**：至少一个 Action Mode 能在 README demo 或 DEMO.md 中复现。
- **Verification**：action usefulness eval；draft-only boundary test；golden snapshots。

### Milestone F: Open Knowledge Substrate

让它成为本地认知底座。

交付：Brain MCP 强化、导出格式、provider 插件规范、只读 agent integration。

Definition of Done：

- **MCP assertion**：Brain MCP 只暴露 read/search/outline/neighborhood 等只读能力，不暴露 create/update/delete/merge/archive。
- **Boundary assertion**：外部 agent 无法绕过用户确认创建 `KnowledgeNode`。
- **Export assertion**：Markdown、JSON 或 graph snapshot 至少一种导出格式有 schema 示例和 round-trip test。
- **Provider assertion**：Provider 插件规范包含接口、env、mock parity、failure recovery；能指导新增一个国内模型 adapter。
- **Security assertion**：API key 不进仓库；文档说明本地配置和未来凭据存储策略。
- **Verification**：MCP invariant tests；export serialization test；provider mock parity test。

## Spec 拆分建议

后续把本蓝图转成 `specs/` 时，建议每个 spec 控制在一个清晰闭环内，不要把整阶段塞进一个大 spec。

### A 系列：Showcase OS Seed

- `KOS-A1-demo-fixtures.md`：固定 demo graph、briefing items、mock voice 操作、auto-curate 结果。
- `KOS-A2-core-loop.md`：启动、自检、简报、入库、星图点亮、自动整理。
- `KOS-A3-undo-report.md`：整理 reason、graph history、undo、整理报告。
- `KOS-A4-github-surface.md`：README、DEMO、ARCHITECTURE、短视频、mock/live 说明。

### B 系列：Radar MVP

- `KOS-B1-world-item-model.md`：`WorldItem`、source、去重、过期策略。
- `KOS-B2-radar-signal.md`：相关度信号、解释、golden ranking eval。
- `KOS-B3-daily-briefing.md`：top 3 选择、用户反馈、失败降级。

### C 系列：Growth Companion

- `KOS-C1-learning-trace.md`：追问、跳过、复习、入库如何形成学习轨迹。
- `KOS-C2-profile-correction.md`：画像查看、修正、下一轮推荐/讲解生效。
- `KOS-C3-interview-mode.md`：基于图谱生成面试追问和回答框架。

### D 系列：Cognitive Graph

- `KOS-D1-provenance.md`：节点来源、更新时间、source refs。
- `KOS-D2-curation-reasons.md`：merge/link/archive reason code 和边迁移。
- `KOS-D3-weekly-brain-review.md`：基于 graph history 的周回顾。

### E 系列：Action OS

- `KOS-E1-action-schema.md`：`CognitiveAction` 模型和权限边界。
- `KOS-E2-project-suggestions.md`：项目 issue/roadmap 草稿生成。
- `KOS-E3-writing-and-research.md`：博客草稿、research follow-up、引用图谱节点。

### F 系列：Open Knowledge Substrate

- `KOS-F1-brain-mcp-boundary.md`：只读 MCP 能力和写边界测试。
- `KOS-F2-export-format.md`：Markdown/JSON/graph snapshot 导出。
- `KOS-F3-provider-plugin-contract.md`：Provider 插件规范、国内模型 adapter 验收。

每个 spec 都必须包含：

- Fixtures
- User-visible flow
- Store/storage assertions
- Invariant assertions
- Failure recovery
- Verification commands
- Out-of-scope list

## 风险清单

- **愿景过大**：用阶段 DoD 和“不做什么”控制范围。
- **图谱污染**：坚持新建长期知识需用户意图，自动整理必须可撤销。
- **推荐质量不稳**：用 fixture eval 和人工 goldens 评估雷达相关度。
- **Provider 不稳定**：mock/demo mode 是底盘，live provider 是加分项。
- **隐私风险**：原始音频/全文不长期保存，外部模型调用边界写进文档。
- **UI 复杂化**：保持星图 + 语音伴侣主界面，复杂操作放浮层或导出，不恢复 dashboard。

## 最终判断

这个项目最有价值的地方，不是语音、图谱、资讯抓取其中任何一个单点，而是它们合在一起形成了一个新的循环：

```mermaid
flowchart LR
  world[WorldChanges] --> filter[PersonalFilter]
  filter --> explain[CompanionExplains]
  explain --> decide[UserDecides]
  decide --> graph[BrainGraphGrows]
  graph --> reflect[ReviewAndActions]
  reflect --> user[UserGrows]
  user --> filter
```

外部世界变化，经过你的兴趣和理解过滤，被伴侣讲给你听。你决定哪些留下，系统把它们整理进长期图谱。图谱再反过来生成复习、行动、项目建议和表达材料。你成长后，过滤器也变得更准。

这就是 my_brain 的最终方向。
