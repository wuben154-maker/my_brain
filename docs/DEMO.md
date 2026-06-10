# Showcase Demo 复现指南

这份指南用于本地复现 KOS-A2 / KOS-A3 的 3 分钟 Showcase 闭环：启动、自检、三条简报、用户确认入库 Graphiti、自动整理报告、撤销整理。Showcase 路径固定使用 mock fixtures，不需要网络，也不需要 API key。

## 前置

- Node.js 20+
- pnpm 9+
- Windows / macOS / Linux 均可先跑 Web 入口；桌面包另需 Tauri prerequisites
- Showcase 路径无需 `.env`、无需 `VITE_OPENAI_API_KEY`

安装依赖：

```bash
pnpm install
```

## 启动

```bash
pnpm dev
```

浏览器打开：

```text
http://localhost:1420/?showcase=1
```

`?showcase=1` 会启用固定 demo graph、固定 3 条 briefing items、固定 mock voice script 和固定 auto-curate 结果。默认数据来自 KOS-A1 fixture 契约，包括：

- `showcase-brief-1`
- `showcase-brief-2`
- `showcase-brief-3`
- `showcase-ingest-graphiti`

## 期望序列

1. **启动自检**：应用进入沉浸式星图界面，伴侣开始 mock 自检。可说「跳过」或等待进入 loading / companion。
2. **固定简报 1**：伴侣讲 `showcase-brief-1`，标题为 OpenAI Realtime API 更新。
3. **用户说「不要」**：系统跳过第 1 条，不新建节点。
4. **固定简报 2**：伴侣讲 `showcase-brief-2`，标题为 `voice-agent-starter`。
5. **用户说「讲细点」**：伴侣补充讲解同一条，并再次询问是否入库。
6. **用户说「不要」**：系统跳过第 2 条，不新建节点。
7. **固定简报 3**：伴侣讲 `showcase-brief-3`，标题为 Graphiti 时序知识图谱。
8. **用户说「入」**：系统通过用户确认入库门控创建概念节点 `showcase-ingest-graphiti`。节点内容是概念级简介，不是新闻片段。
9. **星图点亮**：Graphiti 新节点聚焦或高亮，成为长期知识图谱中的一颗新星。
10. **自动整理报告出现**：入库后的 curation 自动新增一条 link，把 `showcase-ingest-graphiti` 连接到 `demo-agent`，原因码为 `ingest_link`。
11. **查看历史面板**：Graph history 中应出现一条 `link` entry，含 summary、reasonCode、reasonDetail 和 affected node ids。
12. **点击「撤销这次整理」**：自动新增的 Graphiti → AI Agent 连边消失，`showcase-ingest-graphiti` 节点仍保留。
13. **伴侣浮层 · 整理报告（KP-03 主路径）**：入库后 companion shell 自动打开 **整理** slot（`companion-shell-curation-slot`），展示 `ingest_link` 原因码与受影响节点；此处是整理报告，**不是**完整 Weekly Review 正文。
14. **Review 入口 CTA**：在整理报告中点击「查看每周脑图回顾」（`companion-review-entry-cta`），进入 **回顾** slot（`companion-shell-review-slot`）。
15. **Weekly Review 正文**：回顾按时间窗口聚合 graph history（自上次 review 起，默认上限 7 天），段落应引用真实 `historyEntry` id（如 link / merge）；无历史时显示诚实空态，不编造节点名。
16. **行动草稿**：回顾底部可看到 draft-only 行动建议标签，无「一键执行」外部写操作。

> Settings 里的「每周脑图回顾」为辅助入口；主路径是 **入库 → auto-curate → 整理报告 → Review CTA → 每周回顾**。

## Mock 语音脚本

无麦克风、浏览器权限受限或需要稳定录制时，可以按 harness 脚本注入 transcript，或使用 UI 中的文字 / mock 控制入口（若当前构建暴露）。标准顺序如下：

| Step | Transcript | 预期解析 | 预期效果 |
|---|---|---|---|
| 0 | `跳过` | interrupt / skip self-check | 进入 loading / companion |
| 1 | `不要` | skip | 跳过 `showcase-brief-1` |
| 2 | `讲细点` | elaborate | 对 `showcase-brief-2` 补充讲解 |
| 2b | `不要` | skip | 跳过 `showcase-brief-2` |
| 3 | `入` | ingest | 创建 `showcase-ingest-graphiti` |
| 4 | UI undo | undo curation entry | 移除 `ingest_link` 连边，节点保留 |

歧义口令应触发安全处理：例如 `入库吧` 可被要求确认，`算了算了` 视为跳过。语音「撤销」不自动执行 undo；撤销以 UI 按钮或明确 harness 事件为准，避免误触。

## Undo 语义

Showcase 的撤销只针对入库后的自动整理 mutation。默认 golden mutation 是：

```text
kind: link
sourceId: showcase-ingest-graphiti
targetId: demo-agent
reasonCode: ingest_link
summary: 已把 Graphiti 连到 AI Agent
```

点击撤销后：

- `showcase-ingest-graphiti → demo-agent` 连边消失。
- `showcase-ingest-graphiti` 节点仍存在，因为它是用户确认入库的长期知识。
- history entry 标记为 undone。
- 已归档示例节点 `demo-bert` 仍是 archived 状态；删除语义始终是归档，不是 hard delete。

## 期望画面

| 阶段 | 应看到什么 |
|---|---|
| 启动 / 自检 | 全屏星图、语音光球、mock/demo 状态 |
| Briefing | 3 条固定 AI/GitHub 趋势按顺序讲解 |
| Ingest | Graphiti 节点点亮，带 source link |
| Curation report | 伴侣浮层整理 slot 或 legacy overlay；展示 `ingest_link`、中文 reasonDetail、受影响节点 |
| Weekly Review CTA | 整理报告中「查看每周脑图回顾」按钮，非 Settings-only |
| Weekly Review body | 回顾 slot 展示 graph history 引用与 draft-only 行动建议 |
| Undo | 自动连边消失，Graphiti 节点保留 |

## 故障排查

| 问题 | 处理 |
|---|---|
| 白屏或 dev server 失败 | 运行 `pnpm check`，确认 Node.js 20+ 和 pnpm 9+ |
| 端口占用 | Vite 默认严格使用 `1420`，关闭占用进程后重试 `pnpm dev` |
| 没有看到固定 3 条简报 | 确认 URL 包含 `?showcase=1` |
| 浏览器要求麦克风权限 | Showcase 可以走 mock transcript；不需要真实麦克风 |
| 误配 live key 后行为不稳定 | 删除相关 `.env` key 或回到 `?showcase=1`，Showcase 应强制 mock |
| 整理报告未出现 | 打开 graph history 面板，确认是否存在 `ingest_link` entry |
| 点击 undo 后 Graphiti 节点还在 | 这是预期行为；undo 只撤销自动整理，不撤销用户确认入库 |

## 建议验证命令

```bash
pnpm test -- runShowcaseLaunchSequence showcaseCompanionScript showcaseCoreLoop
pnpm test -- curationReportOverlay graphHistoryPanel graphHistoryStore showcaseUndoReport
pnpm test -- buildWeeklyBrainReview weeklyReview weeklyReviewMainflow draftOnlyBoundary graphHistoryCitation
pnpm check
```

可选视觉验证：

```bash
pnpm visual:loop --companion
```
