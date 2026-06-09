# KOS-A4 — GitHub 展示面文档（`github-surface`）

- **阶段：** KOS-A · **状态：** ✅ 已实现
- **上游：** KOS-A1、KOS-A2、KOS-A3 · **下游：** KOS-B1（Radar MVP，可选）
- **复用：** 现有 `README.md`、`docs/handbook/PROJECT_HANDBOOK.md`、`docs/V2_REAL_API_ACCEPTANCE.md`、`AGENTS.md`
- **依赖 / 前置里程碑：** **KOS-A2/A3** 行为可演示（至少 mock 路径）；A1 fixture 名称稳定
- **可并行性：** 文档结构与 A1 并行起草；**截图/短视频验收依赖 A2/A3 完成**

> **定位：** **文档 spec，非代码重 spec。** 让 GitHub 访客在 3 分钟内理解产品形态、信任边界、mock/live 分界，并能本地复现 Showcase 闭环。交付 README 增补、**DEMO.md**、**ARCHITECTURE.md**、mock/live 边界说明、短视频脚本。

## 1. 目标

产出对外可读的 **GitHub 展示面包**，满足 Milestone A DoD 中的 **Docs assertion**：

1. **README** 增补「Showcase 3 分钟体验」入口与 trust boundary 摘要。
2. **DEMO.md**（新增）：逐步复现 KOS-A2 闭环（含 undo）。
3. **ARCHITECTURE.md**（新增或 `docs/handbook` 提炼）：知识 OS 四层架构 + 与代码目录映射。
4. **Mock vs Live 边界表**：何种能力需要 API key、默认路径是什么。
5. **短视频脚本**（30–90s）：星图 + 语音 + 入库 + 整理 + undo 镜头清单。
6. **不变量声明**：用户确认 create、自动 curation、只读 MCP、记忆边界。

## 2. 非目标

- 不实现新功能代码（仅文档、截图资产、可选 `package.json` script 指向已有命令）。
- 不重写完整 PRODUCT.md / 愿景全文（链到 `docs/KNOWLEDGE_OS_VISION.md`）。
- 不做多语言本地化（中文为主，英文 README 保持现有结构，增补 Showcase 段）。
- 不发布到 npm / 不配置 CI 新 job（沿用 `pnpm check`、visual companion）。
- 不承诺 live Radar / Weekly Review（标注 roadmap）。

## 3. 契约 / 交付文件

| 文件 | 动作 | 内容要点 |
|---|---|---|
| `README.md` | 增补 § | Showcase 一键启动、`?showcase=1`、3 分钟步骤摘要、信任边界表链接 |
| `docs/DEMO.md` | **新增** | 逐步操作、期望画面、故障排查、undo 步骤 |
| `docs/ARCHITECTURE.md` | **新增** | 四层系统图、mermaid 数据流、目录映射、权限四级 |
| `docs/SHOWCASE_MOCK_LIVE.md` | **新增** | Provider 矩阵、env 变量、无 key 默认路径 |
| `docs/video/SHOWCASE_SCRIPT.md` | **新增** | 分镜脚本 + 旁白 + 录制命令 |
| `assets/showcase-*.png` | 可选 | companion 快照（visual loop 产出） |

### 3.1 README 增补结构（中文 §）

必须包含：

- 一句话：**个人知识操作系统**，非 RSS/非普通 RAG 聊天。
- **3 分钟体验**：`pnpm dev` → `http://localhost:1420/?showcase=1`。
- 步骤 bullet：启动 → 3 条趋势 → 入库 Graphiti → 看整理原因 → 撤销。
- 链接：`docs/DEMO.md`、`docs/ARCHITECTURE.md`、`docs/KNOWLEDGE_OS_VISION.md`。
- Badge/CI 保持现有。

### 3.2 DEMO.md 大纲（真源步骤 = KOS-A2 + A3）

```markdown
## 前置
- Node 20+, pnpm 9+
- 无需 API key（Showcase 路径）

## 启动
pnpm install && pnpm dev
浏览器打开 http://localhost:1420/?showcase=1

## 期望序列
1. 启动自检（可跳过）
2. 伴侣讲 3 条 AI/GitHub 趋势
3. 对第 1 条说「不要」
4. 对第 2 条说「讲细点」，再「不要」
5. 对第 3 条说「入」→ 星图出现 Graphiti
6. 浮层显示整理原因（连到 AI Agent）
7. 点击撤销 → 连线消失，节点保留

## Mock 语音
无麦克风时：设置面板 / harness 注入 transcript（文档说明 dev 入口）

## 故障排查
- 白屏 → pnpm check
- 无资讯 → 确认 ?showcase=1
- 整理报告未出现 → 查 graph history 面板
```

### 3.3 ARCHITECTURE.md 大纲

必须含 mermaid（与愿景一致，简化）：

```mermaid
flowchart LR
  radar[信息雷达] --> briefing[每日简报]
  briefing --> companion[语音伴侣]
  companion --> ingest[用户确认入库]
  ingest --> graph[知识图谱]
  graph --> curation[自动整理]
  curation --> history[历史与撤销]
  graph --> actions[认知操作层]
```

**代码映射表（示例）：**

| 概念 | 路径 |
|---|---|
| 语音伴侣 | `src/conversation/ConversationConductor.ts` |
| 入库门控 | `src/conversation/ingestActions.ts` |
| 自动整理 | `src/agent/curation/autoCurate.ts` |
| 变更历史 | `src/stores/graphHistoryStore.ts` |
| Showcase fixtures | `src/showcase/showcaseFixtures.ts` |
| Brain MCP 只读 | `src/mcp/**` |

**权限四级（Read / Suggest / Auto-organize / User-confirmed write）** — 表格引用愿景文档。

### 3.4 Mock vs Live 边界（`SHOWCASE_MOCK_LIVE.md`）

| 能力 | 默认（无 key） | Live（验收期） | 文档引用 |
|---|---|---|---|
| 语音 | MockVoiceProvider | OpenAI Realtime | `docs/V2_REAL_API_ACCEPTANCE.md` |
| LLM | MockLlmProvider | OpenAI API | 同上 |
| 资讯 | Showcase 固定 3 条 | RSS + GitHub fetch | A2 launch 分支 |
| Embedding | Mock | 可选真实 | auto-curate 语义邻域 |
| 记忆 | Mock / 可选 EverMemOS | sidecar | M 系列 spec |
| 图谱写入 | ingest + auto-curate | 同左 | 不变量 |

**明确写法：** 「Showcase 演示 **不得** 要求配置 `.env`。」

### 3.5 短视频脚本要点

| 镜号 | 画面 | 旁白（中文） |
|---|---|---|
| 1 | 全屏星图 + 光球 | 这是 my_brain，个人知识操作系统。 |
| 2 | 自检 → loading | 本地运行，默认不需要 API key。 |
| 3 | 伴侣讲趋势 | 它讲清 AI 与 GitHub 变化，不是你去看 RSS。 |
| 4 | 语音「入」 | 只有你确认，才会进入长期图谱。 |
| 5 | 新节点亮起 | Graphiti 成为一颗新星。 |
| 6 | 整理报告浮层 | 系统自动连边，并告诉你为什么。 |
| 7 | 点击撤销 | 整理可撤销，不是黑盒。 |
| 8 | Logo + GitHub | 开源、local-first、可复现 demo。 |

录制建议：`pnpm dev` + `?showcase=1`；时长 60–90s；可选 `docs/video/` 存旁白稿。

## 4. 数据结构 / store

本 spec **无新增 store**。文档中引用的运行时状态：

- `?showcase=1` → `showcaseDemoMode`
- `appStore.phase`、`newsQueue`、`graphHistoryStore.entries`

## 5. 验收清单

- [ ] `docs/DEMO.md` 存在；逐步与 KOS-A2/A3 harness **逐步对齐**（逐步编号一致）。
- [ ] `docs/ARCHITECTURE.md` 存在；含 mermaid + 目录映射 + 权限四级表。
- [ ] `docs/SHOWCASE_MOCK_LIVE.md` 存在；明确无 key 可完成 3 分钟闭环。
- [ ] README 含 Showcase 入口链接与 3 分钟摘要。
- [ ] 文档声明：**新建节点仅用户确认**；**MCP 只读**；**记忆引擎不写图谱**。
- [ ] `docs/video/SHOWCASE_SCRIPT.md` 存在（至少 6 镜）。
- [ ] 文档中的节点/资讯 id 与 KOS-A1 一致（`showcase-brief-*`、`showcase-ingest-graphiti`）。
- [ ] 英文 README 增补短段 Showcase + link to DEMO.md（可与中文并存）。
- [ ] 无「自动替你发 issue/发文章」暗示（行动层仅建议，愿景 Stage 5）。

## 6. 涉及不变量

- 文档表述与 `AGENTS.md`、`specs/README.md` 一致。
- 不写「AI 自动入库」；写「用户语音确认入库」。
- 不写「删除节点」；写「归档 / 撤销整理」。
- Brain MCP：**只读默认**。
- Local-first；Showcase 不依赖云。

## 7. 测试（harness）

文档 spec 以 **可执行检查** 为主：

- `docs-lint.test.ts`（可选新增）：必需文件存在、含关键字 `showcase=1`、`ingest_link`。
- 人工 PR checklist：按 DEMO.md 走一遍，勾选逐步。
- 链接检查：README → DEMO / ARCHITECTURE / VISION 无 404。
- 与 A1 常量交叉引用脚本（可选 `scripts/verify-doc-fixtures.ts`）：文档 id 与 `showcaseFixtures.ts` 一致。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 文档与 mock 行为漂移 | DEMO 步骤编号绑定 A2 harness；CI doc fixture 校验 |
| README 过长 | Showcase 摘要 + 链到 DEMO 全文 |
| 访客无麦克风 | DEMO 写清 transcript 注入 / 设置面板 |
| 愿景过大吓跑访客 | ARCHITECTURE 标注 Stage 1 已实现 vs roadmap |

## 9. DoD

- 全部 §3 交付文件合并到 main 后，新访客可按 DEMO.md **10 分钟内**跑通 showcase（含 clone/install）。
- Maintainers 确认短视频脚本可拍（至少静态截图版）。
- KOS-A 系列 Milestone A **Docs assertion** 满足愿景 Milestone A 定义。

---

## Harness（验收协议）

### Scope

- **做：** README/DEMO/ARCHITECTURE/mock-live/video 脚本与截图指引。
- **不做：** 功能实现、Radar、新 Provider、CI 大改。

### Input fixtures

- KOS-A1 常量表（文档引用 id）。
- KOS-A2 逐步编号、KOS-A3 undo 步骤。
- 现有 `README.md`、`PROJECT_HANDBOOK.md` 作基底。

### User actions

1. 维护者按 `docs/DEMO.md` 从 clone 到 undo 全流程操作。
2. 审查者核对 ARCHITECTURE 权限表与 AGENTS.md 一致。
3. （可选）按视频脚本录屏。

### Expected observations

| 文档 | 读者应能理解 |
|---|---|
| README | 产品是什么、如何 3 分钟试用 |
| DEMO.md | 逐步可复现、无 key |
| ARCHITECTURE.md | 数据流、代码在哪、信任边界 |
| MOCK_LIVE | 何时需要 key |
| VIDEO | 展示闭环而非功能清单 |

### Assertions

- 文件存在性 + 必需关键词 grep（CI 可选）。
- DEMO 每步的「期望画面」与 A2 Expected observations 一一对应。
- 文档不出现 forbidden claims（见下）。

### Forbidden behaviors

- 文档写「自动写入图谱」而无用户确认限定。
- 文档写 Brain MCP 可 create/update/delete。
- 文档写 Showcase **必须** API key。
- 文档把 `WorldItem` 写成已永久入库（Radar 未实现）。
- 文档承诺 mobile / 云同步 / 多用户（愿景明确不做）。

### Failure recovery

| 情况 | 文档应指引 |
|---|---|
| `pnpm dev` 失败 | 检查 Node 版本、`pnpm install` |
| 非 showcase 队列 | 加 `?showcase=1` |
| 端口占用 | `1420` 冲突处理 |
| live key 误配 | 指向 MOCK_LIVE，删除 key 回 mock |

### Verification commands

```bash
# 文档存在（维护者 / 可选 CI；PowerShell/Node 跨平台）
node -e "for (const f of ['docs/DEMO.md','docs/ARCHITECTURE.md','docs/SHOWCASE_MOCK_LIVE.md']) { if (!require('fs').existsSync(f)) { console.error('missing ' + f); process.exit(1); } }"

# 行为与 A 系列一致
pnpm test -- showcaseCoreLoop showcaseUndoReport
pnpm check

# 视觉（可选）
pnpm visual:loop --companion
```

### Out-of-scope

- 官网 / 独立 landing page。
- 英文完整翻译 DEMO.md。
- GitHub Actions 自动录屏。
- 投资人 pitch deck。
- KOS-B 及以后系列文档（可在 ARCHITECTURE roadmap 一节列出链接占位）。
