# specs/ — 单里程碑工作单（SRS）

> 文档层级：`PRODUCT.md`（PRD v2）→ **`AGENTS.md`**（架构 RFC）→ **`specs/*`（单里程碑 spec，本目录）** → 代码。
> 每份 spec 是一个**可独立合并的 PR 的契约**：钉死目标、接口签名、数据迁移、验收清单、测试用例、风险与完成定义（DoD）。
> 原则：代码是 spec 的机械翻译；spec 未明确的行为不写进代码。harness engineering 要求每个工作单开工前先有 spec。

## 不变量（所有 spec 必须遵守，来自 `AGENTS.md` / `PRODUCT.md` v2）

1. **三层记忆分离**：原始音频/新闻全文聊完即丢；知识图谱永久；用户画像永久生长（**画像蒸馏静默执行，无需用户确认**）。
2. **入库 = 用户语音确认（保留）**：是否把资讯变成概念节点，仅能通过 **「入 / 不要 / 讲细点」** 等语音确认（V3）；口令歧义 **首次 reprompt（再问一遍）**，二次仍不清才 skip；禁止静默 create。
3. **入库后的图谱结构整理 = AI 自动执行（覆盖旧「先建议后确认」）**：merge / archive / link / attach / edge-migrate 在入库后 **直接 apply**，无需审批 UI（V4）。**兜底三件套**：归档=隐藏不真删；每次结构变更进 **变更历史** 且 **可一键撤销**；**偶尔语音口头汇报**（节流）。
4. **删除 = 归档**；边随节点迁移；**节点 = 概念 + 简介**（附来源链接，非新闻碎片）。
5. **可打断语音**（硬需求）；**本地优先** / 隐私。
6. **Provider 可替换**：新能力以接口形式接入，不直接依赖厂商 SDK。
7. **Agent 写能力边界**：**新建概念节点**仍只能经用户确认入库出口；**agent/curation 层**在 V4 路径拥有 **整理类** 图谱写能力（自动 merge/archive/link）。**禁止**经提议收件箱主流程静默落库（v2 主流程下线 inbox）。
8. **记忆边界（M 系列，继续有效）**：记忆引擎只读注入上下文，**绝不写图谱/画像**；`remember` 只收蒸馏纯文本；EverMemOS 仅在 `src/providers/memory/` 适配。v2 自动整理 ≠ 记忆引擎写图谱。

> **无法本地部署 ollama**；**全程 mock-first**，里程碑均需 mock 可演示；**验收期**才接真 OpenAI Realtime / LLM API key（见 V7 接真清单）。

## V 系列里程碑（v2 沉浸式重做）

| Spec | 代号 | 依赖 | 状态 | 一句话 |
|---|---|---|---|---|
| [V0-immersive-shell](./V0-immersive-shell.md) | `immersive-shell` | — | ✅ 已实现 | 单一沉浸式外壳：全屏星图 + 语音光球 + 角落设置 |
| [V1-launch-selfcheck](./V1-launch-selfcheck.md) | `launch-selfcheck` | V0 | ✅ 已实现 | 电影感启动 + 语音自检播报 + 注入大脑加载动画 |
| [V2-conversation-conductor](./V2-conversation-conductor.md) | `conversation-conductor` | V0, V1 | ✅ 已实现 | ★ 对话编排状态机：闲聊/资讯/入库问/讲知识 + barge-in |
| [V3-voice-ingest](./V3-voice-ingest.md) | `voice-ingest` | V2 | ✅ 已实现 | 语音三口令入库；概念节点 + 来源链接 |
| [V4-auto-curate](./V4-auto-curate.md) | `auto-curate` | V3 | ✅ 已实现 | ★ 入库后自动整理 + 变更历史/撤销 + 口头汇报 |
| [V5-profile-voice](./V5-profile-voice.md) | `profile-voice` | V0, V2 | ✅ 已实现 | 画像静默蒸馏 + 音色/人格设置 |
| [V6-star-brain](./V6-star-brain.md) | `star-brain` | V2 | ✅ 已实现 | 星图科幻打磨 + 串讲同步高亮 + 悬停概要 |
| [V7-cutover-hardening](./V7-cutover-hardening.md) | `cutover-hardening` | V0–V6 | ✅ 已实现 | 死 UI 清理、e2e 冒烟、接真 key 清单、文档同步 |

执行顺序速记（V 系列）：
```
V0 → V1 → V2 → V3 → V4 →（V5、V6 可与 V3/V4 并行）→ V7
```

### 架构裁定索引（主控定稿，已写入对应 spec）

| # | 裁定 | 落点 |
|---|---|---|
| 1 | `LaunchPhase` 五态（`boot` → `self_check` → `loading` → `companion` → `error`）；`boot` 可见短屏；旧 ready/onboarding→companion | V0 §3、V1 §1/§3 |
| 2 | `VoiceProvider.speak` + `setVoice`；Realtime 会话内 response；mock/openai 同签 | V1 §3、V5 §3 |
| 3 | `graphHistoryStore` = 全量 before/after 快照；op 日志后续 | V4 §3 |
| 4 | 视觉双轨：`main` 冻结至 V6；V6 新增 `companion` 基线；V7 退役 main | V0 §5、V6 §3、V7 §3/§5 |
| 5 | 冷启动「第一颗星」= V2 登场 Turn + onboarding 子态；验收见 V2/V3 | V2 §1/§5、V3 §5 |
| 6 | v2 关停 A3/C2 产提议 job；抓取→`newsQueue`→briefing；C2→autoCurate | V2 §1、V4 §2b、V7 §3/§5 |
| 7 | 入库歧义：reprompt → 二次仍不清才 skip | V3 §3/§5、本页不变量 #2 |
| 8 | `agent_proposals` 只读 legacy，不删表不迁移 | V4 §4、V7 §4 |
| 9 | 文档引用统一 **`AGENTS.md`** | 本 README、V7 §1/§5 |

---

## 里程碑索引（A/B/C — 逻辑复用，形态已取代）

> **状态说明 `superseded(逻辑复用)`**：下列 spec 的 **底层逻辑**（Agent 内核、打分、归档检测、persona、proposal 落库模式等）在 V 系列中 **择优复用**；其 **「逐条审批 UI / 多分区仪表盘」** 产品形态已被 v2（V0–V7）取代。实现 v2 时 **勿** 恢复收件箱/导航为主流程，除非 V7 显式保留 legacy。

| Spec | 代号 | 阶段 | 状态 | 一句话 |
|---|---|---|---|---|
| [A1-agent-core](./A1-agent-core.md) | `agent-core` | A | superseded(逻辑复用) | Sense→Plan→Act→Reflect 内核（纯函数+mock，只读护栏） |
| [A2-proposal-inbox](./A2-proposal-inbox.md) | `proposal-inbox` | A | superseded(逻辑复用) | 提议收件箱：持久化 + 状态机 + 确认即复用现有落库 |
| [A3-morning-brief-job](./A3-morning-brief-job.md) | `morning-brief` | A | superseded(逻辑复用) | 晨间简报+**产提议**（v2 **关停**；抓取改喂 `newsQueue`） |
| [A4-inbox-ui](./A4-inbox-ui.md) | `inbox-ui` | A | superseded(逻辑复用) | 星图旁「待办建议」抽屉 + 简报卡片，逐条确认 |
| [A5-local-scheduler](./A5-local-scheduler.md) | `local-scheduler` | A | superseded(逻辑复用) | 本机定时触发（L1），可开关、可中断 |
| [B1-research-loop-job](./B1-research-loop-job.md) | `research-loop` | B | superseded(逻辑复用) | 围绕主题的多步自主研究链，产成批关联提议 |
| [B2-llm-research-extensions](./B2-llm-research-extensions.md) | `research-llm` | B | superseded(逻辑复用) | `LlmProvider` 扩展 `planResearch`/`synthesizeConcepts` |
| [B3-research-trace-view](./B3-research-trace-view.md) | `research-view` | B | superseded(逻辑复用) | 调研轨迹可视化 + 关联提议星图预览高亮 |
| [C1-profile-driven-curation](./C1-profile-driven-curation.md) | `profile-curation` | C | superseded(逻辑复用) | 用画像给资讯打分排序、讲解深度自适应 |
| [C2-proactive-archive](./C2-proactive-archive.md) | `proactive-archive` | C | superseded(逻辑复用) | 产归档提议（v2 **关停**；由 V4 `autoCurate` 直接 archive） |
| [C3-profile-growth-loop](./C3-profile-growth-loop.md) | `profile-growth` | C | superseded(逻辑复用) | Agent 运行 + 用户接受/拒绝反哺画像权重 |
| [C4-persona-engine](./C4-persona-engine.md) | `persona-engine` | C | superseded(逻辑复用) | 声明式人格预设 + feel-first 两段式讲解（知识伴侣，非情感 AI） |

## 记忆引擎里程碑（M 系列 · 复用 / 继续有效）

> 借鉴 EverMemOS，走 `MemoryProvider` 接口；**只读注入、只写蒸馏文本**，**绝不写图谱/画像**（不变量 8）。与 V4「agent/curation 自动整理写图谱」不冲突。

| Spec | 代号 | 阶段/时机 | 状态 | 一句话 |
|---|---|---|---|---|
| [M0-memory-provider-evermemos](./M0-memory-provider-evermemos.md) | `memory-provider` | A 段收尾 → B 段地基 | ✅ 已实现 | `MemoryProvider` + EverMemOS 适配器 + mock + 优雅降级 |
| [M1-recall-grounding](./M1-recall-grounding.md) | `recall-grounding` | B 段开端 | ✅ 已实现 | 回答前 recall 注入；会话末回写蒸馏记忆 |
| [M3-layered-retrieval](./M3-layered-retrieval.md) | `layered-retrieval` | B | ✅ 已实现 | 主题→概念→事实 由粗到细召回 |
| [M2-salience-decay](./M2-salience-decay.md) | `salience-decay` | C | ✅ 已实现 | 显著度+衰减，**只产信号**（V4 autoCurate 可消费） |

## 导航与可视化里程碑（N/G 系列 · superseded 形态，G1 渲染复用）

> v2 **砍掉**左侧导航与多分区；**G1 真 3D** 与 2D 星图渲染仍由 V6 复用。

| Spec | 代号 | 阶段/时机 | 状态 | 一句话 | 对应导航项 |
|---|---|---|---|---|---|
| [N0-navigation-shell](./N0-navigation-shell.md) | `navigation-shell` | H0 之后 | superseded(逻辑复用) | 分区路由外壳 | （全部，基建） |
| [N1-explore-feed](./N1-explore-feed.md) | `explore-feed` | A | superseded(逻辑复用) | 今日资讯浏览区 | 探索 |
| [N4-settings](./N4-settings.md) | `settings` | A | superseded(逻辑复用) | 完整设置分区 | 设置 → V5 SettingsOverlay |
| [G1-graph-3d](./G1-graph-3d.md) | `graph-3d` | A 段收尾 | superseded(逻辑复用) | 真 3D 星图开关 | 知识图谱 → V6 主画布 |
| [N2-docs-library](./N2-docs-library.md) | `docs-library` | B | superseded(逻辑复用) | 来源索引区 | 文档库 |
| [N3-mindmap-view](./N3-mindmap-view.md) | `mindmap-view` | B/C | superseded(逻辑复用) | 图谱大纲树 | 思维导图 |

## 硬化工作单（H 系列 · 复用 / 继续有效）

| Spec | 代号 | 执行时机 | 状态 | 一句话 |
|---|---|---|---|---|
| [H0-coverage-ratchet](./H0-coverage-ratchet.md) | `coverage-ratchet` | 持续 | ✅ 已实现 | 覆盖率下限 + 分支保护 |
| [H1-cost-guardrail](./H1-cost-guardrail.md) | `cost-guardrail` | A5 / B1 | ✅ 已实现 | token 预算 + 单日上限 |
| [H2-ci-e2e-and-desktop](./H2-ci-e2e-and-desktop.md) | `ci-e2e-desktop` | A4/B3/收尾 | ✅ 已实现 | visual-smoke + tauri-build；V7 改 companion 轨并退役 `visual=main` |
| [H3-memory-eval](./H3-memory-eval.md) | `memory-eval` | M1/C3 | ✅ 已实现 | recall@5 + 画像成长曲线 mock 评测 |

---

## 通用 DoD（每个里程碑都要满足）

- `pnpm lint` + `pnpm check` 全绿（Husky pre-commit/pre-push 已挂）。
- 新增/改动有对应 `*.test.ts`，**mock 优先**，不依赖真实网络/真实 API key。
- 不违反上文 **v2 不变量**；涉及图谱写入的 spec 须区分 **用户确认 create** vs **自动整理**。
- v2 主流程 **禁止静默提议**（无 `saveProposal` pending）；后台 **A3/C2 产提议 job 默认关停**（见 V4 §2b、V7）。
- 涉及记忆引擎的须补「不写图谱/画像」断言。
- 该 PR 可独立 demo（命令或截图）；V 系列默认路径为 **沉浸式 companion**。

## 已知债务 / 顺延项（spec-verifier 记账）

> 由 spec-verifier 在里程碑验收时登记；**不阻塞当前合并**，供下一里程碑认领。证据行号以登记时仓库快照为准。

| 编号 | 描述 | 证据 (file:line) | 影响 / 与不变量关系 | 严重度 | 计划处置 |
|---|---|---|---|---|---|
| #4 | **newsQueue 仅内存**：启动抓取的资讯候选只存 Zustand、不落 SQLite；刷新或重启即丢。 | `src/stores/appStore.ts:28-55`、`src/lib/runLaunchSequence.ts:114-116` | 字面弱违背本地持久化预期，但非 DB 泄漏；会话级候选可丢、图谱/画像仍持久。 | 低 | V7 或后续评估会话级持久化。 |
| H2-storage | **存储无事务**：`applyGraphMutation` 与 `persistGraphSnapshot` 分步落库，非原子。 | `src/lib/graphMutations.ts:105-235`、`237+`；调用例 `src/stores/proposalStore.ts:77` | 部分写/损坏风险；V4 undo 依赖快照兜底。 | 中 | 单列 **H5-storage-transactions** |
| coverage-flake | **coverage 首跑偶发 exit 1**：复跑才过；CI 可能偶红。 | 见 `H0-coverage-ratchet` | 不影响产品不变量。 | 中 | 排查 Vitest coverage 根因 |
| H4-openai-mode | **OpenAI 模式端到端缺口**：配 Key 时多项 fail-fast。 | `src/providers/llm/openaiLlmProvider.ts:34-44`、`53-76` | mock 默认路径不受影响。 | 中 | **V7** `docs/V2_REAL_API_ACCEPTANCE.md` 跟踪 |
| bundle-size | **生产 bundle >500kB 警告** | 构建输出 | 无功能违背。 | 低 | 代码分割 / 懒加载 |
| v2-cutover | **A/B/C/N/G UI 与 v2 不变量文字不一致** | 旧 spec 正文、`docs/PROJECT_STATUS.md` | 文档漂移；以 **本 README + V 系列 + PRODUCT v2** 为准直至 V7 刷新。 | 低 | V7 文档同步 |
