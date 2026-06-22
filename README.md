# my_brain

[![CI](https://github.com/wuben154-maker/my_brain/actions/workflows/ci.yml/badge.svg)](https://github.com/wuben154-maker/my_brain/actions/workflows/ci.yml)

**Voice-first · Local-first · Concept-level knowledge graph · Interruptible by design**

沉浸式语音知识伴侣 — iOS / Android 双端 App + 共享 `@my-brain/core` 逻辑层

[中文](#中文) · [English](#english)

**Repository:** [github.com/wuben154-maker/my_brain](https://github.com/wuben154-maker/my_brain)

---

<a id="中文"></a>

## 中文

### 这是什么

**my_brain** 是一款**语音优先、本地优先**的 AI 知识伴侣：全屏「大脑星图 + 语音光球」沉浸式界面，用可打断的实时语音陪你聊 AI 资讯与 GitHub 趋势，把信息沉淀成**概念级知识图谱**（不是新闻剪报堆）。

### 核心特色

| 特色 | 说明 |
|------|------|
| **可打断语音** | 随时插话，助手立刻停说转听（豆包 realtime / OpenAI Realtime 可切换） |
| **你决定入库** | 新建概念节点必须经语音确认（「入 / 不要 / 讲细点」） |
| **入库后自动整理** | merge / link / archive 由 AI 自动执行，写入可撤销变更历史 |
| **三层记忆分离** | 会话原文 ephemeral；图谱与画像 persistent；记忆引擎不写图谱 |
| **本地 SQLite** | 数据留在设备；API Key 存 Secure Store，不进 APK/IPA |
| **双端 App** | Android release APK 可侧载分享；iOS 支持 Xcode 本地或 EAS 云构建 |
| **快速捕获** | Android 分享 intent 进候选队列；入库门控不变 |

### 快速开始（移动 App）

**要求：** Node.js 20+ · pnpm 9+ · Android SDK（打 APK）或 Mac/Xcode / EAS（iOS）

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
```

1. **编译 Android release APK**（推荐给他人安装）— 详见 [`docs/mobile/BUILD.md`](./docs/mobile/BUILD.md)

```bash
bash apps/mobile/scripts/build-android-release-apk.sh
# 产物: apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

2. **配置 API Key** — 打开 App → **信任与设置 → Provider 设置**，填入豆包语音 + ModelScope LLM（或你选用的 provider）。开发期可将 `.env.example` 复制为 `.env.local` 供 Metro 自动灌入。

3. **iOS** — 有 Mac 用 `expo prebuild` + Xcode；无 Mac 用 EAS 云构建，见 [`docs/mobile/BUILD.md`](./docs/mobile/BUILD.md)。

### 仓库结构

| 路径 | 说明 |
|------|------|
| [`apps/mobile/`](./apps/mobile/) | Expo / React Native 双端 App（第一产品入口） |
| [`packages/core/`](./packages/core/) | 共享业务逻辑：对话、入库门控、图谱、curation、providers |
| [`src/`](./src/) | Legacy Web / Tauri 桌面壳（开发用，非移动主线） |
| [`docs/mobile/BUILD.md`](./docs/mobile/BUILD.md) | **双端编译安装完整说明** |
| [`PRODUCT.md`](./PRODUCT.md) | 产品 PRD v2 |
| [`AGENTS.md`](./AGENTS.md) | 架构不变量与编码约束 |

### 测试

```bash
pnpm --filter @my-brain/mobile test
pnpm --filter @my-brain/core test
pnpm scan:secrets
```

### 桌面 / Web Showcase 3 分钟体验

Legacy Web/Tauri 仍可用于无手机的 mock 演示（**不是移动 App 默认入口**）：

```bash
pnpm dev
```

打开 [`http://localhost:1420/?showcase=1`](http://localhost:1420/?showcase=1)。

**默认启动体验（KP-01 / Radar mock-first）：** 无 query flag 时走 Radar mock-first 启动（今日 top 3 + `RadarSignal`，live 失败则 fixture 兜底）。`?showcase=1` 为固定演示脚本；RSS flatten legacy 仅在 Radar 全空/失败时兜底，**不是**默认主路径（not the default path）。

Showcase 步骤与信任边界见 [`docs/DEMO.md`](./docs/DEMO.md)、[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)、[`docs/SHOWCASE_MOCK_LIVE.md`](./docs/SHOWCASE_MOCK_LIVE.md)、[`docs/KNOWLEDGE_OS_VISION.md`](./docs/KNOWLEDGE_OS_VISION.md)。

### 更多文档

| 文档 | 说明 |
|------|------|
| [`docs/mobile/BUILD.md`](./docs/mobile/BUILD.md) | 双端编译安装 |
| [`PRODUCT.md`](./PRODUCT.md) | 产品 PRD v2 |
| [`AGENTS.md`](./AGENTS.md) | 架构不变量 |
| [`docs/evals/README.md`](./docs/evals/README.md) | 成熟度标签与 eval 命令 |
| [`specs/mobile-app/README.md`](./specs/mobile-app/README.md) | M 系列移动实施索引 |

### 桌面 / Web（可选）

```bash
pnpm dev          # http://localhost:1420 — mock providers
pnpm tauri dev    # Tauri 2 桌面
```

---

<a id="english"></a>

## English

### What it is

**my_brain** is a **voice-first, local-first** AI knowledge companion for **iOS and Android**: an immersive full-screen constellation UI with an interruptible voice orb, turning AI news and GitHub trends into a **concept-level knowledge graph**—not a feed reader.

### Highlights

| Feature | Description |
|---------|-------------|
| **Barge-in voice** | Interrupt anytime; assistant stops speaking and listens |
| **User-gated ingest** | New concept nodes require explicit voice confirmation |
| **Auto curation after ingest** | merge / link / archive with undoable graph history |
| **Three-layer memory** | Ephemeral session raw data; persistent graph & profile |
| **On-device SQLite** | API keys in Secure Store—never embedded in release builds |
| **Dual platform** | Android release APK sideload; iOS via Xcode or EAS cloud build |
| **Quick capture** | Android share intents → provisional queue, same ingest gate |

### Quick start (mobile)

See **[`docs/mobile/BUILD.md`](./docs/mobile/BUILD.md)** for full Android APK + iOS build instructions.

```bash
git clone https://github.com/wuben154-maker/my_brain.git
cd my_brain
pnpm install
bash apps/mobile/scripts/build-android-release-apk.sh
```

Configure API keys in-app under **Settings → Provider settings** (or copy `.env.example` → `.env.local` for Metro dev seeding only).

### Desktop / Web Showcase In 3 Minutes

Legacy web/Tauri demo (not the mobile default entry):

```bash
pnpm dev && open http://localhost:1420/?showcase=1
```

**Default launch (KP-01):** no query flag → **Radar mock-first** briefing; `?showcase=1` → fixed showcase script. RSS flatten legacy runs only when Radar fails — **not the default path**.

See [`docs/DEMO.md`](./docs/DEMO.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/SHOWCASE_MOCK_LIVE.md`](./docs/SHOWCASE_MOCK_LIVE.md), [`docs/KNOWLEDGE_OS_VISION.md`](./docs/KNOWLEDGE_OS_VISION.md), and [`docs/evals/README.md`](./docs/evals/README.md).

### Optional desktop / web

```bash
pnpm dev && open http://localhost:1420
```

---

## License

[MIT](./LICENSE) © 2026 wuben154-maker
