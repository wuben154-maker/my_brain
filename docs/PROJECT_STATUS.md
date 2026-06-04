# my_brain — 项目现状报告

> **读者**：给其他 AI 模型 / 新加入的开发者。读完本文应能回答：这是什么产品、架构怎么分层、目前做到哪、缺什么、从哪里继续改。
>
> **更新时间**：2026-06-04（与 `specs/README.md` 里程碑索引、`AGENTS.md` 对照；若二者冲突，以 **spec 头部状态 + 本报告「差距」节** 为准）。
>
> **更细的契约**：单功能见 `specs/*.md`；产品全文见 `PRODUCT.md`；架构 RFC 见 `AGENT.md`。

---

## 1. 一句话定义

**my_brain** 是一个**语音优先、本地存储**的 AI 知识伴侣（v2 沉浸式星图）：帮用户追 AI 资讯与 GitHub 趋势，**语音确认入库**后由 AI **自动整理**图谱（merge/link/archive，可撤销），科幻星图 UI + 可打断语音。用得越久，画像越准。

---

## 2. 产品灵魂（七条不变量）

实现与评审时必须遵守（摘自 `AGENTS.md` / `specs/README.md`）：

| # | 要点 |
|---|------|
| 1 | **三层记忆分离**：原始音频/全文聊完即丢；图谱永久；用户画像永久生长 |
| 2 | **入库=用户语音确认**（V3）：新建概念仅经「入/不要/讲细点」 |
| 3 | **入库后整理=自动**（V4）：merge/archive/link 直接 apply + `graph_history` 可 undo；**新建节点**仍须 #2 |
| 4 | **删除=归档**：旧节点隐藏可恢复；合并时边迁移到新节点 |
| 5 | **节点=概念+短简介**，不是新闻片段 |
| 6 | **可打断语音**（MVP 硬需求；Realtime 路径已实现 barge-in 代码） |
| 7 | **本地优先**：SQLite 存图谱/画像/提议；MVP 无云端后端 |

**记忆引擎（M 系列，派生层）**：可选 EverMemOS sidecar，**只读注入对话、只写蒸馏文本**，绝不写图谱/画像（见 `memory-boundary` rule）。

---

## 3. 技术栈（锁定）

| 层 | 选型 |
|----|------|
| 语言 | TypeScript strict |
| 壳 | Tauri 2（桌面）+ 同一 React 代码库的 Web 构建 |
| UI | React 18 + Vite + Tailwind；状态 Zustand |
| 图谱可视化 | `react-force-graph-2d`（默认）+ `react-force-graph-3d` / three.js（G1 开关） |
| 存储 | SQLite：`better-sqlite3`（Web 开发/Vite 插件）/ `@tauri-apps/plugin-sql`（桌面） |
| 语音 | `VoiceProvider` → Mock / OpenAI Realtime |
| LLM | `LlmProvider` → Mock（默认）/ OpenAI（fail-fast，未完整接入） |
| 记忆 | `MemoryProvider` → Mock（默认）/ EverMemOS REST sidecar |
| 资讯 | `NewsSource` 插件（启动抓取 RSS + GitHub trending 等） |

**开发命令**（仓库根目录）：

```bash
pnpm install
pnpm dev          # Web，http://localhost:1420
pnpm check        # typecheck + lint + test
pnpm coverage     # 覆盖率（下限见 vitest.config.ts / H0 spec）
pnpm build        # 生产 Web 构建
pnpm tauri dev    # 桌面（需 Rust/Tauri 环境）
```

---

## 4. 架构分层（读代码的顺序）

```
PRODUCT.md          产品 PRD
AGENT.md            架构 RFC、Agent A/B/C 阶段、记忆 B 方案
specs/*.md          单里程碑工作单（接口签名 + 验收清单）
src/
  domain/           图谱、新闻等领域类型
  storage/          StorageProvider、SQLite 适配器、迁移、提议持久化
  lib/              图谱变更、启动流程、salience、persona 提示词等纯逻辑
  providers/        Voice / LLM / Memory / News（可替换）
  agent/            Sense→Plan→Act→Reflect、定时任务、晨间简报、研究链
  stores/           Zustand（app、graph、ingest、proposal、profile…）
  hooks/            资讯入库会话、语音、收件箱、手动图谱操作
  components/       v2 主路径 `ImmersiveScene`；legacy 分区组件仍保留但不挂 AppShell
  invariants/       产品不变量行为测试（高价值回归）
  eval/memory/      H3 记忆评测 harness
```

**新建节点出口**：用户语音确认 → `applyIngestCreate` → `persistGraphSnapshot`。**入库后整理**：`runAutoCurateAfterIngest`（V4，不经 proposal inbox）。Legacy `proposalStore.approve` 仅只读归档路径。记忆引擎 **无** 写图谱/画像能力。

---

## 5. 里程碑实现情况（spec 索引）

`specs/README.md` 中 **A / B / C / M / N / G / H 系列共 26 份 spec，头部均标 ✅ 已实现**（以 harness 测试 + mock 路径为主，非全部「生产级 OpenAI/EverMemOS 联机」）。

### A 段 — Agent 基建与收件箱

| Spec | 能力摘要 |
|------|----------|
| A1 | Agent 内核（只读工具 + runner） |
| A2 | 提议收件箱持久化与状态机 |
| A3 | 晨间简报 job（抓取→去重→**只入 pending 提议**，不自动改图谱） |
| A4 | 收件箱 UI + 简报卡片 |
| A5 | 本机定时调度（可开关） |

### B 段 — 自主研究

| Spec | 能力摘要 |
|------|----------|
| B1 | 主题多步研究 job，产出批量提议 |
| B2 | LLM `planResearch` / `synthesizeConcepts`（Mock 完整，OpenAI fail-fast） |
| B3 | 调研轨迹可视化 + 星图预览高亮 |

### C 段 — 画像与伴侣感

| Spec | 能力摘要 |
|------|----------|
| C1 | 画像驱动资讯排序/讲解深度 |
| C2 | 主动归档**提议**（吃 M2 显著度信号，不自动归档） |
| C3 | 接受/拒绝提议反哺画像权重 |
| C4 | 声明式人格预设 + feel-first 讲解（`src/persona/presets/*.md`） |

### M 段 — 记忆引擎（EverMemOS B 方案）

| Spec | 能力摘要 |
|------|----------|
| M0 | `MemoryProvider` + `everMemOsProvider` + mock + sidecar 文档（`vendor/EverMemOS/README.md`） |
| M1 | 回答前 recall grounding、会话末 remember |
| M2 | 显著度 + 指数衰减（只产信号） |
| M3 | 由粗到细分层 recall |

### N / G — 导航与可视化

| Spec | 能力摘要 |
|------|----------|
| N0 | 左侧 Nav 分区路由 |
| N1 | 探索区资讯流 + 入库确认 |
| N2 | 文档库（来源索引） |
| N3 | 思维导图大纲视图 |
| N4 | 设置（调度、Provider 模式、人格等） |
| G1 | 3D 星图开关（2D 仍为默认） |

### H — 硬化

| Spec | 能力摘要 |
|------|----------|
| H0 | 覆盖率棘轮（functions ≥75% 等） |
| H1 | Token/成本护栏 |
| H2 | CI visual-smoke + tauri-build 脚本 |
| H3 | recall@5 + 画像成长 mock 评测 |

---

## 6. 当前运行形态（默认开发体验）

| 能力 | 默认模式 | 说明 |
|------|----------|------|
| LLM | **mock** | 图谱提议、讲解、研究链可走通；不耗 API |
| Memory | **mock** | 无 Docker 即可开发/CI |
| Voice | **mock** 或 Realtime | 配 `VITE_OPENAI_API_KEY` 可走 Realtime WebSocket；barge-in 有实现与 mock 测 |
| 存储 | **SQLite 本地** | Web dev 经 Vite 插件写 `better-sqlite3` |
| 图谱变更 | **UI 确认** | 探索区逐条 confirm；收件箱逐条 approve；占位符 ID 经 `resolveProposalForApply` 解析 |

**环境变量**（见 `.env.example`）：`VITE_LLM_PROVIDER`、`VITE_MEMORY_PROVIDER`、`VITE_OPENAI_API_KEY`、`VITE_EVERMEMOS_*` 等。

---

## 7. 与 MVP 产品文档的差距（重要）

`AGENTS.md` 顶部仍写 **「Scaffolded」** — **已过时**。spec 级功能大量落地，但 **PRODUCT.md 定义的完整 MVP 用户体验** 仍有缺口：

| MVP 承诺（PRODUCT.md） | 现状 |
|------------------------|------|
| 完整冷启动（起名→人格→兴趣聊→点亮第一颗星） | 仅有 `appStore.phase === "onboarding"` 与启动流水线；**无独立 onboarding 向导 UI** |
| 全程可打断语音主路径 | Realtime Provider + Mock 测试有；**端到端语音驱动入库主流程未产品化** |
| OpenAI LLM 真实摘要/入库提议 | `openaiLlmProvider` 对 ingest/research/summarize **fail-fast**；须 mock 或后续接入 |
| EverMemOS 真联机召回 | 适配器与契约已写；**CI/默认 dev 不依赖 sidecar** |
| 串讲图谱同步高亮 | 部分视觉/token 有；**与语音强绑定的 walkthrough 未完整** |

**结论**：仓库处于 **「spec 里程碑宽覆盖 + mock 路径可演示 + 测试 320+」**，而非 **「开箱即用、全 OpenAI、全语音的成品 MVP」**。

---

## 8. 已知技术债务（spec-verifier / specs 登记）

| 编号 | 描述 | 严重度 |
|------|------|--------|
| H2-storage | `persistGraphSnapshot` 多步落库无事务 | 中 |
| H4-openai-mode | `VITE_LLM_PROVIDER=openai` 有 key 仍不可用 | 中 |
| #4 | 启动 `newsQueue` 仅内存，重启丢失 | 低 |
| bundle-size | 生产 JS chunk >500kB 警告 | 低 |
| coverage-flake | coverage 偶发首跑失败 | 中 |

完整表见 `specs/README.md` §「已知债务」。

---

## 9. 外部借鉴（非 fork）

| 项目 | 关系 |
|------|------|
| [EverOS](https://github.com/EverMind-AI/EverOS) | 可选记忆 sidecar；`src/providers/memory/everMemOsProvider.ts` REST 适配；文档 `vendor/EverMemOS/README.md` |
| [OpenHer](https://github.com/kellyvv/OpenHer) | 产品灵感：声明式人格（SOUL 风格）、feel-first、显著度/召回思路；**无代码依赖** |

---

## 10. 质量与验收现状

- **测试**：约 **320** 个 Vitest 用例（`pnpm test`）；不变量集中在 `src/invariants/productInvariants*.test.ts`
- **Lint / 类型**：`pnpm check` 为合并前基线；Husky pre-commit 挂钩
- **覆盖率**：`pnpm coverage`，All files functions 约 **79%+**（阈值 75，H0）
- **spec-verifier**：`.cursor/skills/spec-verifier/` 有分层验收编排与 `verification-state.md` 快照

---

## 11. 给其他模型的「接手指南」

1. **先读** `PRODUCT.md`（为什么）→ 本文件（做到哪）→ 要改的 **`specs/XX.md`**（契约）
2. **改 `src/` 前** 对照 spec 验收清单；遵守 `AGENTS.md` 不变量
3. **默认用 mock Provider** 开发与单测；不要假设 OpenAI/EverMemOS 在线
4. **图谱写入** 必须走提议 + 用户确认；禁止在 agent/memory 模块直接 `persistGraphSnapshot`
5. **Provider 边界**：厂商 SDK/REST 只出现在 `src/providers/**` 适配器内
6. **提交前** 跑 `pnpm check`；涉及 UI 回归可参考 `docs/VISUAL_FEEDBACK.md`

---

## 12. 文档索引

| 文件 | 用途 |
|------|------|
| `PRODUCT.md` | 产品 PRD、MVP 范围 |
| `AGENT.md` | 架构、Agent 阶段、记忆 B 方案（注意 Status 段落可能滞后） |
| `specs/README.md` | 里程碑索引 + 不变量 + 债务表 |
| `specs/*.md` | 单功能工作单 |
| `docs/VISUAL_FEEDBACK.md` | Playwright 截图回归 |
| `.cursor/skills/spec-verifier/` | 对抗式验收流程与最近验收结论 |

---

*本报告由实现状态梳理生成；功能变更后请同步更新 §5–§8，并考虑刷新 `AGENTS.md` 的 Status 段落。*
