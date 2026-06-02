# specs/ — 单里程碑工作单（SRS）

> 文档层级：`PRODUCT.md`（PRD）→ `AGENT.md`（架构 RFC）→ **`specs/*`（单里程碑 spec，本目录）** → 代码。
> 每份 spec 是一个**可独立合并的 PR 的契约**：钉死目标、接口签名、数据迁移、验收清单、测试用例、风险与完成定义（DoD）。
> 原则：代码是 spec 的机械翻译；spec 未明确的行为不写进代码。harness engineering 要求每个工作单开工前先有 spec。

## 不变量（所有 spec 必须遵守，来自 `AGENTS.md`）
1. 三层记忆分离：原始音频/原文聊完即丢；图谱永久；画像永久生长。
2. **任何图谱结构变更（merge/archive/link/create/attach/update）一律先建议、用户确认后才执行。**
3. 删除=归档；边随节点迁移；节点=概念+简介。
4. 可打断语音；本地优先 / 隐私。
5. Provider 可替换：新能力以接口形式接入，不直接依赖厂商 SDK。
6. **Agent 无写图谱能力**：唯一落库出口是「提议收件箱 → 用户确认 → `applyGraphMutation` + `persistGraphSnapshot`」。
7. **记忆边界（M 系列引入）**：记忆引擎只读注入上下文，**绝不写图谱/画像**；`remember` 只收**蒸馏纯文本**（禁原始音频/全文/密钥）；EverMemOS 为**本机自部署**，REST/SDK 仅在 `src/providers/memory/` 适配器内。详见 `.cursor/rules/memory-boundary.mdc`。

## 里程碑索引

| Spec | 代号 | 阶段 | 状态 | 一句话 |
|---|---|---|---|---|
| [A1-agent-core](./A1-agent-core.md) | `agent-core` | A | ✅ 已实现 | Sense→Plan→Act→Reflect 内核（纯函数+mock，只读护栏） |
| [A2-proposal-inbox](./A2-proposal-inbox.md) | `proposal-inbox` | A | ✅ 已实现 | 提议收件箱：持久化 + 状态机 + 确认即复用现有落库 |
| [A3-morning-brief-job](./A3-morning-brief-job.md) | `morning-brief` | A | ✅ 已实现 | 后台抓取→去重→预提炼→产出晨间简报+提议（带预算护栏） |
| [A4-inbox-ui](./A4-inbox-ui.md) | `inbox-ui` | A | ✅ 已实现 | 星图旁「待办建议」抽屉 + 简报卡片，逐条确认 |
| [A5-local-scheduler](./A5-local-scheduler.md) | `local-scheduler` | A | ✅ 已实现 | 本机定时触发（L1），可开关、可中断 |
| [B1-research-loop-job](./B1-research-loop-job.md) | `research-loop` | B | 📝 待做 | 围绕主题的多步自主研究链，产成批关联提议 |
| [B2-llm-research-extensions](./B2-llm-research-extensions.md) | `research-llm` | B | 📝 待做 | `LlmProvider` 扩展 `planResearch`/`synthesizeConcepts` |
| [B3-research-trace-view](./B3-research-trace-view.md) | `research-view` | B | 📝 待做 | 调研轨迹可视化 + 关联提议星图预览高亮 |
| [C1-profile-driven-curation](./C1-profile-driven-curation.md) | `profile-curation` | C | 📝 待做 | 用画像给资讯打分排序、讲解深度自适应 |
| [C2-proactive-archive](./C2-proactive-archive.md) | `proactive-archive` | C | 📝 待做 | 定期扫描，主动产「归档过时节点」提议（不自动执行） |
| [C3-profile-growth-loop](./C3-profile-growth-loop.md) | `profile-growth` | C | 📝 待做 | Agent 运行 + 用户接受/拒绝反哺画像权重 |
| [C4-persona-engine](./C4-persona-engine.md) | `persona-engine` | C | 📝 待做 | 声明式人格预设 + feel-first 两段式讲解（知识伴侣，非情感 AI） |

## 记忆引擎里程碑（M 系列 · EverMemOS B 方案）

> 借鉴 EverOS（EverCore/HyperMem）与 OpenHer，给系统加**长期记忆 + 召回**。统一走 `MemoryProvider` 接口（不变量 5），EverMemOS 为**本机自部署 Docker sidecar**（不变量 7），只读注入、只写蒸馏文本（不变量 1/6/7）。**依赖例外**：B 方案引入 Python 3.12 + Docker，已批准并记录在 M0。

| Spec | 代号 | 阶段/时机 | 状态 | 一句话 |
|---|---|---|---|---|
| [M0-memory-provider-evermemos](./M0-memory-provider-evermemos.md) | `memory-provider` | **A 段收尾 → B 段地基（B1 之前）** | 📝 待做 | `MemoryProvider` 接口 + EverMemOS 适配器/sidecar + mock + 优雅降级 |
| [M1-recall-grounding](./M1-recall-grounding.md) | `recall-grounding` | B 段开端（紧跟 M0） | 📝 待做 | 回答前 recall 注入（80/20 混合）、会话末回写蒸馏记忆 |
| [M3-layered-retrieval](./M3-layered-retrieval.md) | `layered-retrieval` | B（配合研究链/N3） | 📝 待做 | 主题→概念→事实 由粗到细召回，层级复用为缩放粒度 |
| [M2-salience-decay](./M2-salience-decay.md) | `salience-decay` | C（C2 之前/同期） | 📝 待做 | 节点/画像/记忆 显著度+衰减，**只产信号**喂 C2 |

## 导航与可视化里程碑（N/G 系列 · 让导航栏每项都有去处）

> 背景：左侧 `NavRail` 的多数图标原是对齐定稿图的装饰外壳，并无 spec 依据。本系列把它们全部落成**真实可跳转分区 + 对应 spec**，并把中央星图升级到真 3D（C 方案）。

| Spec | 代号 | 阶段/时机 | 状态 | 一句话 | 对应导航项 |
|---|---|---|---|---|---|
| [N0-navigation-shell](./N0-navigation-shell.md) | `navigation-shell` | **H0 之后、A4 之前** | ✅ 已实现 | 分区路由外壳：点击即跳转 + 规划中占位 + 死链守卫测试 | （全部，基建） |
| [N1-explore-feed](./N1-explore-feed.md) | `explore-feed` | A（跟 A4 前后） | ✅ 已实现 | 今日资讯/趋势浏览区，复用 ingest 建议→确认 | 探索 |
| [N4-settings](./N4-settings.md) | `settings` | A（跟 A5） | ✅ 已实现 | 设置区：调度开关/Provider 模式/人格/隐私 | 设置 |
| [G1-graph-3d](./G1-graph-3d.md) | `graph-3d` | A 段收尾 / B（B3 前或同期） | ✅ 已实现 | 真 3D 星图（three.js），2D 默认+基线不动，3D 走「3D 视图」开关 | 知识图谱 |
| [N2-docs-library](./N2-docs-library.md) | `docs-library` | B（穿插） | 📝 待做 | 来源/出处索引区，回链星图定位 | 文档库 |
| [N3-mindmap-view](./N3-mindmap-view.md) | `mindmap-view` | B/C（非 MVP 必做，可暂缓） | 📝 待做 | 图谱分层大纲/树视角 | 思维导图 |

> 已有里程碑承担的导航项：**知识图谱**=主视图（N0 默认区，G1 加 3D）；**智能体**=[A4 收件箱](./A4-inbox-ui.md)（挂 `agent` 分区）；**分析洞察**=[B3 调研轨迹](./B3-research-trace-view.md)（挂 `insight` 分区）。

## 硬化工作单（Hardening · 跟随功能里程碑穿插执行）

> 这些不是新功能，而是把安全机制接到更早、更难绕过的触发点。**执行时机**已与功能里程碑绑定，按下表顺序插入。

| Spec | 代号 | 执行时机 | 一句话 |
|---|---|---|---|
| [H0-coverage-ratchet](./H0-coverage-ratchet.md) | `coverage-ratchet` | **现在（A4 之前）** | 覆盖率下限 + GitHub 分支保护（基建棘轮，越早越好） |
| [H1-cost-guardrail](./H1-cost-guardrail.md) | `cost-guardrail` | **跟 A5**（B1 加强） | ✅ 已实现：token 预算断言化 + 单日上限，自主调度前焊死 |
| [H2-ci-e2e-and-desktop](./H2-ci-e2e-and-desktop.md) | `ci-e2e-desktop` | **3b 跟 A4 / 3c 跟 B3 / 3d A 段收尾** | 3b+3d ✅：visual-smoke + `tauri-build` job；3c 待 B3 |
| [H3-memory-eval](./H3-memory-eval.md) | `memory-eval` | **起步跟 M1 / 加强跟 C3** | 记忆召回质量 + 自进化曲线 评测断言（mock+固定语料，会红灯） |

执行顺序速记（含 N/G/M 系列）：
```
现在        → H0（覆盖率 + 分支保护）
            → N0（导航外壳：点击即跳转 + 占位 + 死链守卫）   ← 让导航立刻“有去处”
A4          → 智能体分区(A4) + H2-3b（收件箱 e2e 冒烟进 CI）
            → N1（探索·资讯流）
A5          → N4（设置分区） + H1（成本护栏断言化 + 单日上限）
A 段收尾    → G1（3D 星图，2D 仍默认） + H2-3d（Tauri 构建进 CI）
──记忆引擎引入（B 段地基）──
M0          → MemoryProvider 接口 + EverMemOS sidecar（B 方案）+ 记忆边界 rule/hook
M1          → 召回式 grounding（注入/回写）  + H3 起步（召回质量评测）
B1          → 研究链（复用 recall/consolidation） + H1 加强（多步预算）
M3          → 分层 coarse-to-fine 检索（配合 B 研究 + N3）
B3          → 洞察分区(B3) + H2-3c（轨迹/预览 e2e；预览高亮需兼容 2D/3D）
B 段穿插    → N2（文档库）
──C 段──
C1          → 画像驱动选题（结合 recall）
M2          → 显著度+衰减（只产信号） → C2（主动归档，吃 M2 信号）
C4          → Persona 引擎精简版（声明式预设 + feel-first）
C3          → 画像生长闭环 + H3 加强（自进化曲线）
B/C（可暂缓）→ N3（思维导图，非 MVP 必做）
```
> 提示一：G1（3D）建议在 B3「星图预览高亮」之前或同期落地，避免返工；其契约要求预览高亮对「当前激活视图」生效，故顺序可调。
> 提示二：M0 是重基建（Docker sidecar），刻意排在 A 段（A4/A5/G1，无外部重依赖）做稳之后；M0 全链路优雅降级，sidecar 未起时应用照常可用，故不阻塞 B 段其余推进。

## 通用 DoD（每个里程碑都要满足）
- `pnpm lint` + `pnpm check` 全绿（Husky pre-commit/pre-push 已挂）。
- 新增/改动有对应 `*.test.ts`，mock 优先，不依赖真实网络/真实 API key。
- 不违反上述任一不变量；涉及 Agent 的均补「无写能力」断言。
- 该 PR 可独立 demo（命令或截图）。
