# AI 编码代理实操手册（产品主人版）

> **读者**：产品主人（非资深工程师）。目标是用 Cursor / Composer 等 AI 代理，按 **spec 驱动** 把 my_brain **v2 沉浸式语音伴侣**一份份做出来。
>
> **文档层级**（从高到低，越往下越「可执行」）：
>
> ```
> PRODUCT.md          产品 PRD（v2 已重写，先读这个定方向）
> AGENTS.md           架构 RFC + 七条不变量 + 开发命令
> specs/*.md          单里程碑工作单（接口签名 + 验收清单 + 测试）
> src/**              代码 = spec 的机械翻译
> ```
>
> **铁律**：先 spec，后代码。没有 spec 就不改 `src/`。
>
> **已落地（2026-06）**：`specs/V0`–`V7` 八份正式 spec；`specs/README.md` v2（V 系列索引 + v2 不变量 + A/B/C/N/G superseded）。产品主人 **直接按第 3 节推进**，无需再补 V2–V7 spec 或担心 README 与 v2 不变量脱节。

---

## 1. 心智模型：为什么「先 spec 后代码」

### 1.1 本仓库在做什么

my_brain v2 要从「多分区仪表盘 + 鼠标逐条审批」变成 **「全屏星图 + 语音光球 + 会说话的伴侣」**。底层 `providers/`、`domain/`、`storage/`、`agent/` 大量复用 v1；变的是 **主体验、入库/整理策略、UI 形态**。

Harness engineering 的核心：**把决策写在 spec 里，把实现交给 AI**。这样：

- 你审的是「做什么、不做什么、怎么验收」，不是逐行 TypeScript。
- AI 不会「顺手」改架构、加功能、违反产品灵魂。
- 每个里程碑 = 一个可独立 demo、可独立合并的 PR。

### 1.2 两个角色

| 角色 | 是谁 | 做什么 |
|------|------|--------|
| **产品主人（你）** | 决策 + 审 spec | 读 `PRODUCT.md` 定方向；批准/打回 spec；验收 mock demo；最后才决定接真 API key |
| **AI 编码代理** | 机械翻译 | 按 spec 写/改代码；跑 `pnpm check`；贴验收证据；**不擅自扩 scope** |

你**不需要**会写 Rust/React，但需要会：

1. 判断 spec 的「目标 / 非目标」是否符合 `PRODUCT.md`。
2. 对照 `AGENTS.md` 七条不变量（尤其 v2 改写的 #2/#3/#6）打勾或打回。
3. 看 AI 贴的测试/截图是否真的能证明验收项。

### 1.3 v2 与 v1 spec 的关系

- `specs/A*.md`、`B*.md`、`C*.md`、`N*.md`、`G*.md` 等在 `specs/README.md` 中已标 **`superseded(逻辑复用)`**：底层 Agent/打分/persona 等 **择优复用**，但 **多分区仪表盘 + 收件箱审批 UI** 形态已被 v2 取代。
- **v2 落地**走 **`specs/V0`–`V7` 共八份正式 spec**（索引与 v2 不变量见 `specs/README.md`）。审 spec 时以 **`AGENTS.md` + `specs/README.md` v2 不变量** 为准：**入库 = 你确认；入库后的 merge/archive/link = AI 自动 + 兜底三件套**。
- **v2 默认关停产「审批提议」的后台 job**（如晨间简报 A3、主动归档提议 C2 等往 `ProposalEnvelope`/收件箱写 pending 的路径）；入库后的整理改走 **V4 `autoCurate`**，不再等用户点「同意」。

### 1.4 开发命令速查

| 命令 | 何时用 |
|------|--------|
| `pnpm dev` | 本地看效果（Web，默认 http://localhost:1420，mock 不耗 key） |
| `pnpm check` | **每个里程碑完工必跑**（lint + test，须全绿） |
| `pnpm coverage` | 覆盖率棘轮（H0）；大改后可选跑 |
| `pnpm build` | 生产构建自检 |
| `pnpm visual:loop` | UI 里程碑：像素对比科幻基线（见 `docs/VISUAL_FEEDBACK.md`） |
| `pnpm tauri dev` | 桌面壳验收（需 Rust 环境；可放到 V7） |

---

## 2. 单里程碑四步循环

每个 V 里程碑（或任意 spec）都走同一套循环。**一次只做一个里程碑**，做完再开下一个。

---

### 第 1 步：让 AI 先写 spec（禁止碰 `src/`）

**时机**：该里程碑 spec 尚不存在，或你需要 **修订** 已批准的 `specs/V*.md`（常规实现 **不要** 再让 AI 从零写 V0–V7）。

**复制粘贴给 AI：**

```text
你在仓库 my_brain。请先读 PRODUCT.md、AGENTS.md、specs/README.md、.cursor/rules/spec-driven-execution.mdc。

任务：为 v2 里程碑 {里程碑代号} 撰写 spec 文件 specs/{spec文件名}.md。
要求：
1. 只写 spec，不要修改 src/，不要跑构建。
2. 结构必须包含：目标、非目标、契约（接口/文件签名）、数据结构或 store 变更、验收清单（可勾选、可测试）、涉及不变量（对照 AGENTS.md v2 七条）、测试 harness、风险与对策、DoD。
3. 目标与非目标边界清晰；非目标里写「不顺手重构、不扩 scope」。
4. 验收清单每条都要能在 mock provider 下验证，不假设 OpenAI 在线。
5. 写明上游/下游里程碑、依赖与可并行性。
6. 若复用 v1 模块（proposalStore、graphMutations、curation 等），在契约里写清「复用哪条路径、v2 改什么行为」。

写完后停下来，等我审 spec，不要开始写代码。
```

**你要做的**：等 AI 交付 `specs/{spec文件名}.md`，进入第 2 步。

---

### 第 2 步：你审 spec 的检查清单

审 spec 时 **不要看代码**，只看文档。打回任一项就回到第 1 步让 AI 改 spec。

#### A. 目标对不对

- [ ] 一句话目标是否对应 `PRODUCT.md` 里 v2 必做项（沉浸壳、启动链、可打断语音伴侣、语音入库、自动整理、画像静默、星图高亮等）？
- [ ] 是否只解决 **这一个** 里程碑该做的事，没有「顺便把 V3 也做了」？

#### B. 非目标有没有越界

- [ ] 「非目标」是否明确写了：不做哪些 **相邻** 里程碑（例如 V0 不做 V2 对话编排）？
- [ ] 是否禁止：顺手重构、改无关 UI、接真 API、删 v1 底层模块？

#### C. 不变量有没有违反（v2 重点）

对照 `AGENTS.md`「Core invariants」：

| # | v2 要点 | spec 里必须体现 |
|---|---------|-----------------|
| 1 | 三层记忆分离 | 不持久化原始音频/全文；图谱/画像永久 |
| 2 | **入库 = 用户语音确认** | 新建概念节点只能经「入/不要/讲细点」门控 |
| 3 | **入库后整理 = AI 自动** | merge/archive/link 自动执行；兜底：归档非真删、变更历史+撤销、偶尔口头汇报 |
| 4 | 删除 = 归档 | 边迁移到新节点 |
| 5 | 节点 = 概念 + 简介 | 不是新闻碎片 |
| 6 | **可打断语音** | 伴侣说话可被 interrupt；记忆引擎仍不写图谱/画像 |
| 7 | 本地优先 | Provider 可替换，业务不绑厂商 SDK |

**常见打回原因**：

- spec 仍写「merge 进收件箱等用户点同意」（那是 v1；v2 入库后整理应自动）。
- spec 让 Agent/记忆引擎 **直接写图谱**（违反记忆边界；新建节点只能经用户确认入库出口）。
- spec 要求真 OpenAI 才能验收（应 mock-first）。

#### D. 验收清单可不可验证

- [ ] 每条验收项是 **可观察行为**（phase 变化、测试断言、data-testid、语音事件顺序），不是「体验更好」这种空话。
- [ ] 有对应 `*.test.ts` 或 visual 快照说明。
- [ ] DoD 含 **`pnpm check` 全绿**。

**审过以后**：回复 AI「spec 批准，按 spec 实现」，进入第 3 步。

---

### 第 3 步：让 AI 只实现这一份 spec

**复制粘贴给 AI：**

```text
specs/{spec文件名}.md 我已审过批准。

请严格按 spec-driven-execution 实现，要求：
1. 开工前先复述本 spec 的「验收清单」和「涉及不变量」各一条，确认理解。
2. 只实现该 spec 契约中的接口/文件/行为；非目标一律不做；不顺手重构无关代码。
3. 默认 mock provider（VITE_LLM_PROVIDER=mock、VITE_VOICE_PROVIDER 未设或 mock），不假设 OpenAI/EverMemOS 在线。
4. 完工后必须跑 pnpm check，须全绿；若有失败先修到绿再继续。
5. 在回复里逐条对照验收清单贴证据（测试名、断言摘要、关键文件路径；UI 项说明如何 demo）。
6. 不要 commit，除非我明确要求。

若 spec 与现有代码冲突，以 spec + AGENTS.md v2 不变量为准；冲突点请先列出再改。
```

**你要做的**：

1. 看 AI 的「复述」是否理解对了（尤其入库 vs 自动整理）。
2. 本地可选 `pnpm dev` 点一点 mock 路径。
3. 确认 `pnpm check` 截图/日志是全绿。
4. UI 相关里程碑进入第 4 步。

---

### 第 4 步：UI 用 `pnpm visual:loop` 视觉回环

**适用**：改布局、启动场景、星图、光球、LaunchScene 等 **看得见** 的里程碑（V0、V1、V5、V6 等）。

**复制粘贴给 AI：**

```text
里程碑 {里程碑代号} 功能已实现且 pnpm check 全绿。请做视觉验收：

1. 读 docs/VISUAL_FEEDBACK.md。
2. 跑 pnpm visual:loop（必要时 pnpm visual:browser 装 Chromium）。
3. 把 report.json 与 diff 结论贴给我：哪些区域通过、哪些超阈值。
4. 若未通过，只改与 spec 相关的样式/布局，改完再 loop 直到通过或说明 spec 需更新 visual 阈值/基线。
5. 按视觉双轨政策选 URL（见 §3.5）：V0–V5 优先 `?visual=boot`；V6 起增加 `?visual=companion`；不要 silent 改 `assets/*.png`。
```

**说明**：

- 定稿参考图在 `assets/*.png`；阈值在 `scripts/visual-feedback/config.mjs`。
- **视觉双轨（主控裁定）**：`?visual=main`（v1 多栏布局）**冻结保留至 V6**；**V6** 引入 **`companion` 沉浸式主帧**基线；**V7** 退役 `main` 与旧 nav 相关 visual/e2e。V0–V5 改 UI 时 **不要** 更新 `main` 基线图。

---

## 3. V 系列推进地图

> **已落地**：`specs/V0`–`V7` 共八份正式 spec + `specs/README.md` v2 索引/不变量/执行顺序均已就绪。产品主人 **直接按表开工**，无需再「补写 V2–V7 spec」或担心 README 与 v2 不变量不一致（旧 A/B/C/N/G 正文若与 v2 冲突，以 **V 系列 + `AGENTS.md`** 为准，V7 统一刷新 `docs/PROJECT_STATUS.md` 等）。

### 3.1 里程碑一览

| 代号 | spec 文件 | 一句话 | 状态 |
|------|-----------|--------|------|
| **V0** | [`V0-immersive-shell.md`](../specs/V0-immersive-shell.md) | 沉浸式外壳：全屏星图 + 语音光球 + 角落设置；下线 NavRail 主路径 | 📝 待实现 |
| **V1** | [`V1-launch-selfcheck.md`](../specs/V1-launch-selfcheck.md) | 电影感启动 + 语音自检播报 + loading 注入动画 → `companion` | 📝 待实现 |
| **V2** | [`V2-conversation-conductor.md`](../specs/V2-conversation-conductor.md) | 对话编排状态机：闲聊/资讯/briefing/入库问/讲知识 + barge-in + 登场首句 | 📝 待实现 |
| **V3** | [`V3-voice-ingest.md`](../specs/V3-voice-ingest.md) | **唯一保留的确认**：「入/不要/讲细点」→ 建概念节点 + 来源链接 | 📝 待实现 |
| **V4** | [`V4-auto-curate.md`](../specs/V4-auto-curate.md) | 入库后 **`autoCurate` 自动整理** + 变更历史/撤销 + 口头汇报 | 📝 待实现 |
| **V5** | [`V5-profile-voice.md`](../specs/V5-profile-voice.md) | 画像静默蒸馏 + 音色/人格设置（SettingsOverlay） | 📝 待实现 |
| **V6** | [`V6-star-brain.md`](../specs/V6-star-brain.md) | 星图科幻打磨 + 串讲同步高亮 + **`companion` visual 基线** | 📝 待实现 |
| **V7** | [`V7-cutover-hardening.md`](../specs/V7-cutover-hardening.md) | 死 UI 清理、`companion.e2e`、接真 key 清单、文档同步 | 📝 待实现 |

### 3.2 依赖关系（什么必须串行）

```text
V0 ──► V1 ──► V2 ──► V3 ──► V4 ──► V7
 │              │
 │              ├──► V6（teaching 高亮；依赖 V2 态契约）
 └──► V5（V0 壳 + V2 会话后蒸馏/人格；可与 V3/V4 并行）
```

| 关系 | 说明 |
|------|------|
| **V0 → 全部** | `LaunchPhase` 五态与 `ImmersiveScene` 是 V1–V7 的地基 |
| **V1 → V2** | 伴侣「登场即开口」需要稳定启动链进入 `companion` |
| **V2 → V3** | `ingest_decision` 态与 briefing 流；语音入库嵌在 conductor 里 |
| **V3 → V4** | 用户确认 create 后触发 **`autoCurate`**（不经收件箱） |
| **V2 → V6** | `teaching` 态 + `highlightNodeIds` 供串讲高亮消费 |
| **V0 + V2 → V5** | 设置浮层 + 会话结束画像蒸馏 |
| **V* → V7** | 真 key 清单、删 legacy UI、`companion.e2e`、visual 退役 `main` |

**冷启动「第一颗星」**：`PRODUCT.md` §六 的情感钩子 **不是独立里程碑**——**V2** 负责 companion 登场、引导进入 briefing；**V3** 负责首条资讯「入」后 **create 第一个概念节点**。审 spec 时勿要求单独「冷启动里程碑」。

### 3.3 什么可以并行（省时间）

用 Cursor **子代理 / Composer 并行任务**时，遵守：**并行的 spec 之间不能有契约冲突**（不共改同一 store 字段、不共改同一文件的大块逻辑）。

| 可并行组合 | 条件 |
|------------|------|
| **V5 ∥ V1** | V5 只动 `SettingsOverlay` + settings store；V1 动 `LaunchScene` / `speakSelfCheck` |
| **V5 ∥ V2** | V5 做 SettingsOverlay + 画像蒸馏；V2 做 conductor（约定 persona/音色读取接口） |
| **V5 ∥ V3 或 V4** | V5 不动 ingest/autoCurate 主路径 |
| **V6 ∥ V3 或 V4** | V6 偏星图高亮/`graphVisualTokens`；V3/V4 偏入库与 `autoCurate`——先冻结 `highlightNodeIds` API |
| **V5 ∥ V6** | 两者 UI 层为主，依赖 V0，互不阻塞 |

**不要并行**：

- V0 与任何其他 V（所有人等 V0 phase/layout 定稿）。
- V3 与 V4（同一入库流水线：先用户 confirm create，再 `autoCurate`）。
- 多个代理 **同时改 `appStore` / `graphStore` / `conversationStore` 契约**（必冲突）。

**并行操作模板：**

```text
你是子任务 B，只做 specs/V5-profile-voice.md。
约束：不要改 LaunchScene、不要改 ingest/autoCurate；只读 V0 已合并的 SettingsOverlay 占位。
先读已合并的 main 上 V0 spec 与 AGENTS.md，再实现。
```

主会话负责：合并 PR 顺序、解决 store 契约冲突、跑全量 `pnpm check`。

### 3.4 推荐执行顺序（产品主人视角）

与 `specs/README.md` 速记一致：`V0 → V1 → V2 → V3 → V4 →（V5、V6 可与 V3/V4 并行）→ V7`

1. **V0** → demo「全屏星图 + 光球」  
2. **V1** → demo「语音自检 + loading → companion」  
3. **V2** → demo「登场首句 + 可打断多轮对话 + briefing 态」  
4. **V3** → demo「讲一条资讯 → 三口令入库 → **第一颗星**（若图为空）」  
5. **V4** → demo「入库后 `autoCurate` 自动整理 + 撤销」  
6. **（并行可选）V5** → demo「改人格/音色 + 静默画像蒸馏」  
7. **（并行可选）V6** → demo「串讲高亮 + companion visual 基线」  
8. **V7** → mock 全链路 `companion.e2e` + 文档 + **接真 key 清单**（切换顺序见 §5.2，不变）

### 3.5 主控裁定（审 spec / 派 AI 时必知）

| 裁定 | 含义 |
|------|------|
| **冷启动第一颗星** | 落在 **V2 + V3**，无单独里程碑；V2 引导 briefing，V3 首条「入」create 节点 |
| **收件箱 / 审批 UI** | v2 主流程 **废弃**；勿恢复 `ProposalInbox`、探索分区逐条点同意。V3 不产 `ProposalEnvelope`；V4 走 **`autoCurate` 直接 apply** |
| **后台 job** | v2 默认 **关停** 往收件箱写 pending 提议的 job（A3 晨间简报、C2 主动归档提议等）；整理信号改由 **入库后 autoCurate** 或 V7 显式 flag 处理 |
| **视觉双轨** | **V0–V5**：`?visual=main` **冻结**，不更新其 `assets/*.png`；**V6**：新增 **`?visual=companion`** 主帧基线；**V7**：退役 `main` 与旧 nav visual/e2e，统一 `VISUAL_FEEDBACK.md` |
| **文档真源** | 不变量与架构约束以 **`AGENTS.md`** 为准；里程碑索引以 **`specs/README.md` v2** 为准 |

---

## 4. 省 token / 提效技巧

### 4.1 委派子代理（Composer / Task）

适合 **成块、边界清晰** 的工作：

| 委派给 subagent | 留在主会话 |
|-----------------|------------|
| 单份 spec 起草（只写 md） | 审 spec、拍板非目标 |
| 单里程碑实现（一个 spec） | 跨里程碑架构冲突 |
| 补测试、`pnpm check` 修红 | 合并 PR、定依赖顺序 |
| `pnpm visual:loop` 迭代 CSS | V6 前勿改 `main` 基线；V6+ 可更新 `companion` 基线（§3.5） |

一次 prompt 只给一个里程碑；附上 **spec 路径 + 禁止事项**。

### 4.2 mock-first，不耗 key

- 默认 **不要** 配 `VITE_OPENAI_API_KEY`；`.env` 保持 mock。
- 资讯、讲解、入库提议、画像蒸馏在 mock LLM 下应有 **确定性或可断言** 行为（测试靠这个）。
- 真实语音/LLM 留到 **V7 验收期** 单点切换（见第 5 节）。

### 4.3 小步提交、一里程碑一 PR

- 每个合并的 PR 应：**只对应一个 spec**、mock 下可 demo、`pnpm check` 绿。
- Commit message 用 Conventional Commits，例如：`feat(v0): immersive shell per spec V0`。
- **不要** 一个 PR 塞 V0+V1+V2；review 和回滚都会噩梦。

### 4.4 上下文纪律（少烧钱、少跑偏）

- 开工 @ 引用：`PRODUCT.md` 相关节 + **当前 spec 全文** + `AGENTS.md` 不变量节即可；不要整仓 `@Codebase`。
- 明确说：**「非目标不要做」**——比事后 revert 便宜得多。
- spec 批准前 **不让 AI 读** 大量无关 v1 UI 代码（NavRail、Inbox 等 **superseded 分区**），除非 spec 写了「迁移/下线/V7 清理」。

### 4.5 视觉迭代

- 样式拉锯用 `pnpm visual:loop --watch`，人盯 `artifacts/visual-feedback/index.html`。
- 让 subagent 专门改 CSS/Tailwind，主代理不动业务逻辑。

---

## 5. 验收期切真 API key（V7）

> **原则**：先 mock 全绿，再 **单点** 换真，**逐点** 验收。不要一上来三个 Provider 全开。

### 5.1 会涉及真 key / 外部服务的点

| 能力 | Provider | 环境变量 | 说明 |
|------|----------|----------|------|
| 语音对话（含 barge-in） | OpenAI Realtime | `VITE_VOICE_PROVIDER=openai-realtime` + `VITE_OPENAI_API_KEY` | 可选 `VITE_OPENAI_REALTIME_MODEL` |
| LLM 讲解 / 摘要 / 入库辅助 / 画像蒸馏 | OpenAI LLM | `VITE_LLM_PROVIDER=openai` + `VITE_OPENAI_API_KEY` | 可选 `VITE_OPENAI_LLM_MODEL`；**当前 openai LLM 部分接口仍为 stub（H4 债务）**，V7 spec 应列清要补全的方法 |
| 长期记忆 recall（可选） | EverMemOS sidecar | `VITE_MEMORY_PROVIDER=evermemos` + `VITE_EVERMEMOS_*` | 需本机 Docker sidecar；未起则优雅降级 mock |

密钥只放 **`.env`**（gitignore），**永远不要** commit 或贴进聊天。

参考模板：仓库根目录 `.env.example`。

### 5.2 推荐切换顺序（安全）

1. **mock 全链路** — `pnpm check` 绿 + 手动 `pnpm dev` 走通 V0–V6 主流程。  
2. **只开 LLM** — `VITE_LLM_PROVIDER=openai`，voice 仍 mock；验证讲解/摘要质量。  
3. **只开 Voice** — `VITE_VOICE_PROVIDER=openai-realtime`，LLM 可仍 mock 或已开；验证打断与延迟。  
4. **LLM + Voice 同开** — 端到端口语伴侣。  
5. **（可选）EverMemOS** — sidecar 起好后 `VITE_MEMORY_PROVIDER=evermemos`；验证 recall 注入，确认 **仍不写图谱**。  
6. **桌面** — `pnpm tauri dev` / `pnpm tauri build` 在真 key 下再跑一轮。

每步：**只改一个变量**，失败就回退 mock，不要带着三个 unknown 同时 debug。

### 5.3 V7 spec 应额外要求

- 产出 **`docs/V2_REAL_API_ACCEPTANCE.md`**（接真清单，与 `V7-cutover-hardening.md` 对齐）。  
- 更新 README / 发布说明：哪些 env 组合受支持；H4 stub 是否在 V7 关闭。  
- 成本提醒：Realtime + LLM 按量计费；冷启动自检口播也会消耗语音配额。  
- Boot 自检在真 voice 下的降级策略（网络失败、key 无效时的中文提示）。  
- **切换顺序仍按 §5.2**（mock 全绿 → 单开 LLM → 单开 Voice → 同开 → 可选 EverMemOS → 桌面），不因 V7 其他清理工作而调整。

---

## 6. 常见坑

### 6.1 违反不变量（最高频）

| 坑 | 正确做法 |
|----|----------|
| 入库后还要用户点「同意 merge」 | v2：**仅新建节点**要语音确认；merge/archive/link **自动** + 历史可撤销 |
| Agent / 记忆引擎直接 `persistGraphSnapshot` | 新建节点只能经 **用户确认入库** 出口；记忆引擎 **只读注入、只写蒸馏文本** |
| 硬删节点 | **归档**（hidden），边迁移 |
| 把新闻标题当节点 | 节点 = **概念 + 短简介** |
| 不可打断的长 monologue | 必须 `voice.interrupt()` / barge-in 可测 |

### 6.2 跳过 spec 直接写代码

- 症状：AI 「帮你加了 StorageProvider 几个方法」但没有验收清单。  
- 后果：范围漂移、难 review、难回滚。  
- 处理：**停止写代码**，回到第 1 步补 spec。

### 6.3 一次塞太多里程碑

- 症状：一个 PR 同时 immersive shell + 语音伴侣 + 自动整理。  
- 后果：冲突爆炸、你无法判断哪条 acceptance 失败了。  
- 处理：**拆 PR**；依赖关系见第 3 节。

### 6.4 不跑 `pnpm check`

- Husky 会在 commit/push 时跑；但 AI 说「做完了」你必须要求 **贴 `pnpm check` 全绿输出**。  
- 只有 UI 改动也要跑——常有 snapshot/store 测试连带红。

### 6.5 照抄 v1「收件箱 / 审批 job」路径

- v1 的 A2/A4 **提议收件箱**、A3 **晨间简报产 pending 提议** 等已在 `specs/README.md` 标 **superseded**；**v2 主路径不得依赖 Inbox UI**。  
- V3：**禁止** `ProposalEnvelope` 进收件箱；V4：走 **`autoCurate` 直接 apply** + `graphHistoryStore`，不是 `proposalStore.approve`。  
- 若 AI 建议「恢复 MorningBrief 让用户点同意」→ 打回：v2 默认 **关停** 产审批提议的后台 job，整理改 **autoCurate**（V7 才清理遗留 job 或改 flag）。

### 6.6 假设 OpenAI 在线才能演示

- CI 与日常开发必须 **mock 可演示**。  
- 真 key 失败不能阻塞 `pnpm check`。

### 6.7 视觉基线违反双轨政策

- **V0–V5**：`?visual=main` 为 v1 布局 **冻结轨**——改 companion UI 时 **不要** 更新 `assets/*main*` 或让 AI silent 改 main 基线。  
- **V6**：才引入 **`?visual=companion`** 沉浸式主帧并更新对应 `assets/`（见 `V6-star-brain.md`）。  
- **V7**：退役 `main` 与旧 nav visual/e2e，同步 `docs/VISUAL_FEEDBACK.md`。  
- 跑 `pnpm visual:loop` 前确认对比的是 **哪条 URL**（boot / companion / 冻结中的 main）。

### 6.8 让 AI 顺手重构

- 禁止词：「顺便整理一下 providers」「统一命名」——除非 spec 非目标里明确允许。  
- 重构应单独 spec（或明确子任务），不要挂在功能里程碑里。

---

## 7. 附录：给 AI 的「开工包」最小引用集

每个里程碑新开对话时，让 AI 先读：

1. `PRODUCT.md` — §〇 v2 三条决策 + §一 核心体验流程 + §六 冷启动（实现落在 V2/V3）  
2. `AGENTS.md` — Core invariants + Commands  
3. `specs/README.md` — v2 不变量 + V 系列索引与执行顺序  
4. `specs/{当前 spec}.md` — 全文  
5. （UI 里程碑）`docs/VISUAL_FEEDBACK.md`（遵守 §3.5 视觉双轨）  
6. （涉及记忆）`.cursor/rules/memory-boundary.mdc`  

**v2 不变量速记卡片**（可单独复制给 AI）：

```text
v2 不变量速记：
- 入库（新建概念）= 用户语音确认；其它聊天聊完即丢。
- 入库后 merge/archive/link = AI 自动；归档非真删；变更历史可撤销；偶尔口头汇报。
- 记忆引擎不写图谱/画像。
- 语音必须可打断。
- mock-first，Provider 可替换，本地优先。
```

---

## 8. 产品主人最小周 checklist

- [ ] 当前只做一个 V 里程碑，spec 已批准  
- [ ] AI 已复述验收清单 + 不变量  
- [ ] `pnpm check` 全绿（已看输出）  
- [ ] mock 下 `pnpm dev` 能 demo 本里程碑  
- [ ] UI 里程碑已跑 `pnpm visual:loop`（对照 **boot / companion**，遵守 §3.5 双轨；或 spec 注明暂缓）  
- [ ] 未 commit 密钥；`.env` 未进 git  
- [ ] PR 标题/描述指向 spec 文件名  
- [ ] 真 key 留到 V7，此前 env 保持 mock  

---

*文档版本：与 v2 `PRODUCT.md` / `AGENTS.md` / `specs/README.md` v2 / `specs/V0`–`V7` 正式 spec 对齐。*
