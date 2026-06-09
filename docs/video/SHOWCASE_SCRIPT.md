# Showcase 短视频脚本

目标时长：60-90 秒。画面重点不是功能清单，而是让观众看懂「个人知识 OS」闭环：外部变化进入、伴侣讲解、用户决定入库、星图点亮、自动整理可解释、undo 可恢复。

## 录制前准备

```bash
pnpm install
pnpm dev
```

打开：

```text
http://localhost:1420/?showcase=1
```

建议录制设置：

- 浏览器窗口 1440x900 或 1920x1080。
- 隐藏书签栏和无关 IDE 窗口。
- 使用 mock transcript 或稳定口令，避免真实麦克风噪声。
- 录屏时保留鼠标移动，但动作要慢。

## 分镜

| 镜号 | 时长 | 画面 | 旁白 | 操作 / 录制提示 |
|---|---:|---|---|---|
| 1 | 0-8s | 全屏星图 + 语音光球，展示 mock/demo 状态 | 这是 my_brain，一个语音优先的个人知识操作系统。它不是 RSS，也不是普通聊天框。 | 从静止星图开始，轻微移动鼠标，让观众看到图谱是可交互的。 |
| 2 | 8-16s | 启动自检 / loading 过渡 | 本地运行，Showcase 默认不需要 API key，也不需要真实网络。 | 地址栏短暂露出 `?showcase=1`，再聚焦主界面。 |
| 3 | 16-28s | 伴侣讲第 1、2 条趋势，画面显示 briefing 状态 | 它会主动讲 3 条 AI 和 GitHub 趋势。你可以说「不要」，也可以说「讲细点」。 | 注入或说「不要」跳过 `showcase-brief-1`；对 `showcase-brief-2` 说「讲细点」。 |
| 4 | 28-42s | Graphiti 简报出现，用户说「入」 | 只有你确认，信息才会变成长期知识。这里我们把 Graphiti 入库。 | 对 `showcase-brief-3` 说「入」；等待新节点高亮。 |
| 5 | 42-54s | 星图中新节点亮起，节点名 Graphiti 可见 | Graphiti 不再是新闻片段，而是一颗带来源的概念节点。 | 鼠标停在新节点附近；如有 hover card，可短暂停留。 |
| 6 | 54-68s | 整理报告浮层出现，显示 `ingest_link` | 入库之后，系统自动把 Graphiti 连到 AI Agent，并告诉你为什么。 | 让 reasonDetail 和 affected nodes 在画面中停留 3 秒。 |
| 7 | 68-80s | 点击「撤销这次整理」，连边消失 | 自动整理不是黑盒。你可以撤销这次整理，Graphiti 节点仍然保留。 | 点击 undo；录到连边消失或 history entry 变为 undone。 |
| 8 | 80-90s | 回到完整星图 + GitHub/README 片尾 | 这就是 my_brain 的 Stage 1：local-first、mock-first、可解释、可复现。 | 片尾可切到 README 的 Showcase 链接或保持星图定格。 |

## 旁白整稿

```text
这是 my_brain，一个语音优先的个人知识操作系统。它不是 RSS，也不是普通聊天框。

本地运行 Showcase 默认不需要 API key，也不需要真实网络。

它会主动讲 3 条 AI 和 GitHub 趋势。你可以说「不要」，也可以说「讲细点」。

只有你确认，信息才会变成长期知识。这里我们把 Graphiti 入库。

Graphiti 不再是新闻片段，而是一颗带来源的概念节点。

入库之后，系统自动把 Graphiti 连到 AI Agent，并告诉你为什么。

自动整理不是黑盒。你可以撤销这次整理，Graphiti 节点仍然保留。

这就是 my_brain 的 Stage 1：local-first、mock-first、可解释、可复现。
```

## 必拍断言

- 画面或地址栏出现 `?showcase=1`。
- 口令或字幕覆盖「不要」「讲细点」「入」。
- 新节点名或说明出现 `Graphiti` / `showcase-ingest-graphiti`。
- 整理原因出现 `ingest_link` 或「已把 Graphiti 连到 AI Agent」。
- Undo 后表达清楚：撤销的是自动整理连边，用户确认入库的节点保留。
