# my_brain

[![CI](https://github.com/wuben154-maker/my_brain/actions/workflows/ci.yml/badge.svg)](https://github.com/wuben154-maker/my_brain/actions/workflows/ci.yml)

**语音优先 · 本地存储 · 自生长知识图谱**  
**Voice-first · Local-first · Self-growing knowledge graph**

[中文](#中文) · [English](#english)

![Immersive UI: star-map brain graph + voice orb](./assets/main-ui-graph-voice.png)

---

<a id="中文"></a>

## 中文

### 是什么

**my_brain** 是一个沉浸式 AI 知识伴侣（桌面 + Web 同一套代码）。它用**人话**讲解 AI 资讯与 GitHub 趋势；是否入库由你**语音确认**（「入 / 不要 / 讲细点」）；入库后的合并、连线、归档由 AI **自动完成**，且可**撤销**。用得越久，画像越准。

v2 形态：全屏 force-directed **大脑星图** + **语音光球**，无多分区仪表盘。

**仓库：** https://github.com/wuben154-maker/my_brain

### 核心特性

| 能力 | 说明 |
|------|------|
| 可打断语音 | 随时插话，伴侣立即停说转听 |
| 语音入库门控 | 新建概念仅经「入 / 不要 / 讲细点」 |
| 入库后自动整理 | merge / link / archive；变更历史 + 撤销 |
| 三层记忆 | 原文聊完即丢；图谱与画像永久、静默生长 |
| 本地优先 | SQLite 本地存储，MVP 无云端后端 |
| 科幻星图 | 2D/3D、串讲高亮、悬停节点/边概要 |
| 可替换 Provider | Voice / LLM / Memory / News / Embedding + Mock |
| 只读 MCP | 外部 Agent 可查询已确认图谱，不能写库 |

### 技术栈

TypeScript · Tauri 2 · React 18 · Vite · Tailwind · Zustand · SQLite · react-force-graph · OpenAI Realtime（可选）

### 快速开始

**环境：** Node.js 20+ · pnpm 9+ · 桌面构建需 [Tauri 前置依赖](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
pnpm dev
```

浏览器打开 http://localhost:1420 。默认 **Mock**，无需 API Key。

```bash
pnpm tauri dev      # 桌面开发
pnpm build          # Web 生产构建
pnpm check          # typecheck + lint + test（CI 同款）
```

**环境变量：** 复制 `.env.example` → `.env`，验收期填写 `VITE_OPENAI_API_KEY` 等。详见仓库内文档。

### 文档

| 文件 | 内容 |
|------|------|
| [`PRODUCT.md`](./PRODUCT.md) | 产品 PRD v2 |
| [`AGENTS.md`](./AGENTS.md) | 架构、不变量、开发命令 |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | 实现现状 |
| [`specs/README.md`](./specs/README.md) | 里程碑 spec 索引 |
| [`docs/BRAIN_MCP.md`](./docs/BRAIN_MCP.md) | 只读 MCP（`MY_BRAIN_MCP=1 pnpm brain:mcp`） |

### 状态

V0–V7 在 spec 与测试层面已实现；默认 **mock-first** 可演示。与全 OpenAI / 全语音成品之间仍有差距，见 [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md)。

---

<a id="english"></a>

## English

### What it is

**my_brain** is an immersive, **voice-first** AI companion (desktop + web from one codebase). It explains AI news and GitHub trends in plain language. **You** decide what enters the knowledge base via voice (“save / skip / explain more”). After ingest, the app **auto-curates** the graph (merge, link, archive) with **undo**. A user profile grows silently over time.

v2 UX: full-screen **force-directed brain graph** + **voice orb** — no multi-panel dashboard.

**Repository:** https://github.com/wuben154-maker/my_brain

### Highlights

| Feature | Description |
|---------|-------------|
| Interruptible voice | Barge-in supported; companion stops and listens |
| Voice ingest gate | New concepts only via explicit voice confirmation |
| Auto-curation | Post-ingest merge / link / archive + history & undo |
| Three memory layers | Raw chat discarded; graph & profile persisted |
| Local-first | SQLite on device; no cloud backend in MVP |
| Sci-fi graph UI | 2D/3D, walkthrough highlight, hover cards |
| Swappable providers | Voice / LLM / Memory / News / Embedding + mocks |
| Read-only MCP | Query confirmed graph from external agents; no writes |

### Tech stack

TypeScript · Tauri 2 · React 18 · Vite · Tailwind · Zustand · SQLite · react-force-graph · OpenAI Realtime (optional)

### Quick start

**Requires:** Node.js 20+ · pnpm 9+ · [Tauri prerequisites](https://tauri.app/start/prerequisites/) for desktop builds

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
pnpm dev
```

Open http://localhost:1420 . **Mock providers** by default — no API key required.

```bash
pnpm tauri dev      # Desktop dev
pnpm build          # Web production build
pnpm check          # typecheck + lint + test (same as CI)
```

**Env:** copy `.env.example` to `.env`; set `VITE_OPENAI_API_KEY` when moving off mocks. See repo docs for details.

### Documentation

| File | Contents |
|------|----------|
| [`PRODUCT.md`](./PRODUCT.md) | Product spec (v2, Chinese) |
| [`AGENTS.md`](./AGENTS.md) | Architecture, invariants, commands |
| [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | Implementation status |
| [`specs/README.md`](./specs/README.md) | Milestone specs index |
| [`docs/BRAIN_MCP.md`](./docs/BRAIN_MCP.md) | Read-only MCP (`MY_BRAIN_MCP=1 pnpm brain:mcp`) |

### Status

V0–V7 milestones are implemented at spec + test level; development is **mock-first**. Gaps vs. a fully wired OpenAI voice product are documented in [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md).

---

## License

`package.json` is marked `"private": true`. Add a LICENSE before public redistribution.
