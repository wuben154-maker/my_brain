# my_brain

[![CI](https://github.com/wuben154-maker/my_brain/actions/workflows/ci.yml/badge.svg)](https://github.com/wuben154-maker/my_brain/actions/workflows/ci.yml)

**Voice-first · Local-first · Concept-level knowledge graph · Interruptible by design**

沉浸式语音知识伴侣 — 概念级图谱、用户门控入库、入库后自动 curation、本地 SQLite 持久化

[中文](#中文) · [English](#english)

**Repository:** [github.com/wuben154-maker/my_brain](https://github.com/wuben154-maker/my_brain)

![Immersive companion UI: force-directed brain graph and voice orb](./assets/main-ui-graph-voice.png)

---

<a id="中文"></a>

## 中文

### 产品定义

**my_brain** 是一款**语音优先**的 AI 知识伴侣：通过可中断的实时语音会话，将 AI 资讯与 GitHub 趋势转化为**概念节点**（concept + intro + relations + source link），沉淀为可演化的 force-directed 知识图谱。新建节点经**语音确认门控**；入库后的 merge / link / archive / edge-migration 由 **auto-curation 管线**自动执行，并写入可撤销的 **graph history**。桌面（Tauri 2）与 Web 共用单一代码库。

### 核心优势

| 维度 | 能力 | 价值 |
|------|------|------|
| **交互范式** | `ConversationConductor` 状态机 + OpenAI Realtime barge-in | 全双工语音、随时中断，避免单向 TTS 流水线 |
| **信任边界** | 用户门控 create（V3）+ 自动 curation（V4） | 写入权限与整理权限分离：你控制「进库」，系统负责「整理」 |
| **图谱语义** | 概念节点而非资讯片段；软归档 + 边迁移 | 多源资讯收敛到同一概念，结构演化可追踪、可恢复 |
| **上下文工程** | `graphContextPack` 有界子图 + `contextTiers` 工作/归档分层 | 按会话态注入 token 预算内的图谱摘要，降低 LLM 上下文噪声 |
| **智能整理** | `autoCurate` + 语义邻域（embedding）+ 规则检测（staleness / salience） | 入库后自动连边、合并、归档，无需审批收件箱 |
| **记忆架构** | 三层分离 + 可选 EverMemOS `MemoryProvider` | 会话原文 ephemeral；图谱与画像 persistent；记忆引擎**不写图谱** |
| **隐私与部署** | SQLite local-first；无 MVP 云端后端 | 数据驻留本机；Provider 接口便于后续扩展 |
| **工程质量** | Spec 驱动（V0–V7）· Vitest 499+ tests · Playwright 视觉回归 · CI 覆盖率棘轮 | mock-first 可演示、可回归，验收期再接真 API |

### 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 语言 | TypeScript (strict) | 全栈类型安全 |
| 桌面壳 | [Tauri 2](https://tauri.app/) | 原生桌面包；Rust 侧最小化 |
| 前端 | React 18 · [Vite 7](https://vitejs.dev/) · Tailwind CSS · Zustand | 沉浸式 UI · 快速 HMR · 轻量全局状态 |
| 图谱可视化 | [react-force-graph-2d/3d](https://github.com/vasturiano/react-force-graph) · three.js | 2D/3D 力导向图、walkthrough 高亮、悬停卡片 |
| 持久化 | SQLite — `better-sqlite3`（Web dev）/ `@tauri-apps/plugin-sql`（桌面） | 图谱、画像、变更历史、schema 迁移 |
| 语音 | `VoiceProvider` → Mock / **OpenAI Realtime API** (speech-to-speech) | 原生 barge-in；接口可替换 |
| 推理 | `LlmProvider` → Mock / OpenAI | 摘要、讲解深度、research、curation 建议 |
| 记忆 | `MemoryProvider` → Mock / EverMemOS REST sidecar | recall grounding · 会话末 remember（仅蒸馏文本） |
| 资讯 | `NewsSource` 插件 — RSS · GitHub trending (star velocity) | 启动抓取 → `newsQueue` → briefing |
| 向量 | `EmbeddingProvider` → Mock / 可扩展 | 语义邻域，支撑 auto-curate |
| Agent | Sense→Plan→Act→Reflect · 本地 scheduler · read-only MCP | 外部 Agent 只读查询图谱，**不绕过入库门控** |
| 质量 | Vitest · Playwright · Husky · GitHub Actions | `pnpm check` · coverage ratchet · visual smoke · `tauri build` |

### 架构要点

```
Voice / News ──► ConversationConductor ──► VoiceProvider.speak / interrupt
                        │
                        ├─ V3 ingest gate ──► applyIngestCreate ──► SQLite
                        ├─ V4 autoCurate ──► applyGraphMutation ──► graphHistoryStore.undo
                        ├─ graphContextPack + contextTiers ──► bounded LLM context
                        └─ V6 walkthrough ──► BrainGraphView highlight sync

MemoryProvider (M) ── read-only inject / remember text ── ✗ graph writes
```

**合法图谱写路径（产品不变量）：**

1. 用户语音确认 → `applyIngestCreate`（V3）
2. 入库后 → `runAutoCurateAfterIngest` / `autoCurate`（V4）

### 快速开始

**要求：** Node.js 20+ · pnpm 9+ · 桌面构建需 [Tauri prerequisites](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
pnpm dev          # http://localhost:1420 — Mock providers，无需 API Key
pnpm check        # typecheck + lint + test（CI 同款）
pnpm tauri dev    # 桌面目标
MY_BRAIN_MCP=1 pnpm brain:mcp   # 只读 MCP → docs/BRAIN_MCP.md
```

环境变量：`.env.example` → `.env`（`VITE_OPENAI_API_KEY`、`VITE_MEMORY_PROVIDER` 等）。mock-first 开发路径见 [`docs/V2_REAL_API_ACCEPTANCE.md`](./docs/V2_REAL_API_ACCEPTANCE.md)。

### 文档

| 文档 | 说明 |
|------|------|
| [`PRODUCT.md`](./PRODUCT.md) | 产品 PRD v2 |
| [`AGENTS.md`](./AGENTS.md) | 架构 RFC · 七条不变量 |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | 实现现状与差距 |
| [`specs/README.md`](./specs/README.md) | V0–V7 / A·B·C·M·H 里程碑 spec |

**状态：** V 系列在 spec 与 harness 测试层面已实现；默认 mock-first 端到端可演示。

---

<a id="english"></a>

## English

### Definition

**my_brain** is a **voice-first** AI knowledge companion. Through **interruptible** real-time speech (OpenAI Realtime), it transforms AI news and GitHub trends into a **concept-level knowledge graph** (concept + intro + relations + source links). **New nodes** require explicit **voice ingest gating** (V3); post-ingest **merge / link / archive / edge migration** runs via an **auto-curation pipeline** (V4) with **undoable graph history**. One codebase ships to **Tauri 2 desktop** and **Vite web**.

### Key advantages

| Dimension | Capability | Benefit |
|-----------|------------|---------|
| **Interaction** | `ConversationConductor` FSM + Realtime barge-in | Full-duplex speech; no one-way TTS pipeline |
| **Trust boundary** | User-gated create (V3) + automated curation (V4) | You control ingestion; the system maintains structure |
| **Graph semantics** | Concept nodes, not news clips; soft archive + edge migration | Multi-source convergence; evolvable, recoverable structure |
| **Context engineering** | Bounded `graphContextPack` + working/archival `contextTiers` | State-aware subgraph digest within token budgets |
| **Intelligent curation** | `autoCurate` + semantic neighbors (embeddings) + staleness/salience rules | Automatic link/merge/archive after ingest—no approval inbox |
| **Memory model** | Three-tier separation + optional EverMemOS | Ephemeral raw session data; persistent graph & profile; memory engine **never writes the graph** |
| **Privacy** | SQLite local-first; no MVP cloud backend | Data stays on device; swappable providers for future sync |
| **Engineering** | Spec-driven V0–V7 · 499+ Vitest tests · Playwright visual CI · coverage ratchet | Mock-first demos with regression safety before live API cutover |

### Tech stack

| Layer | Technology | Role |
|-------|------------|------|
| Language | TypeScript (strict) | End-to-end type safety |
| Desktop | [Tauri 2](https://tauri.app/) | Native desktop bundle |
| Frontend | React 18 · [Vite 7](https://vitejs.dev/) · Tailwind · Zustand | Immersive UI · HMR · lightweight state |
| Visualization | [react-force-graph-2d/3d](https://github.com/vasturiano/react-force-graph) · three.js | Force-directed 2D/3D graph, walkthrough highlight |
| Storage | SQLite — `better-sqlite3` / `@tauri-apps/plugin-sql` | Graph, profile, history, migrations |
| Voice | `VoiceProvider` → Mock / **OpenAI Realtime** | Speech-to-speech with native interruption |
| LLM | `LlmProvider` → Mock / OpenAI | Summarization, teaching depth, research, curation |
| Memory | `MemoryProvider` → Mock / EverMemOS sidecar | Recall grounding; session-end distilled text only |
| News | Pluggable `NewsSource` — RSS, GitHub trending | Launch fetch → `newsQueue` → briefing |
| Embeddings | `EmbeddingProvider` → Mock / pluggable | Semantic neighbors for auto-curation |
| Integration | Agent runner · local scheduler · read-only Brain MCP | External agents query confirmed graph—**no write bypass** |
| Quality | Vitest · Playwright · Husky · GitHub Actions | `pnpm check` · coverage · visual smoke · `tauri build` |

### Architecture

```
Voice / News ──► ConversationConductor ──► VoiceProvider.speak / interrupt
                        │
                        ├─ V3 ingest gate ──► applyIngestCreate ──► SQLite
                        ├─ V4 autoCurate ──► applyGraphMutation ──► graphHistoryStore.undo
                        ├─ graphContextPack + contextTiers ──► bounded LLM context
                        └─ V6 walkthrough ──► BrainGraphView highlight sync

MemoryProvider (M) ── read-only inject / remember text ── ✗ graph writes
```

**Authorized graph write paths (product invariants):**

1. Voice-confirmed ingest → `applyIngestCreate` (V3)
2. Post-ingest → `runAutoCurateAfterIngest` / `autoCurate` (V4)

### Quick start

**Requires:** Node.js 20+ · pnpm 9+ · [Tauri prerequisites](https://tauri.app/start/prerequisites/) for desktop

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
pnpm dev          # http://localhost:1420 — mock providers, no API key
pnpm check        # Same gate as CI
pnpm tauri dev    # Desktop target
MY_BRAIN_MCP=1 pnpm brain:mcp   # Read-only MCP — see docs/BRAIN_MCP.md
```

Env: copy `.env.example` to `.env`. Mock-first path and live API checklist: [`docs/V2_REAL_API_ACCEPTANCE.md`](./docs/V2_REAL_API_ACCEPTANCE.md).

### Documentation

| Doc | Contents |
|-----|----------|
| [`PRODUCT.md`](./PRODUCT.md) | Product spec v2 |
| [`AGENTS.md`](./AGENTS.md) | Architecture RFC · seven invariants |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | Status & gaps |
| [`specs/README.md`](./specs/README.md) | V0–V7 / A·B·C·M·H milestone specs |

**Status:** V-series implemented at spec + harness level; mock-first end-to-end demo available.

---

## License

`package.json` is `"private": true`. Add a LICENSE before public redistribution.
