# DESIGN.md — my_brain 视觉设计系统

> 全项目视觉的**唯一真理来源**。任何页面/组件的颜色、间距、字体、动效都必须引用本文件的 token，不得随性发挥。改样式 = 先改这里，再改代码。

本系统从两张定稿概念图抽取：
- `assets/boot-self-check.png` — 启动自检画面
- `assets/main-ui-graph-voice.png` — 主界面（左 2/3 图谱 + 右 1/3 语音）

风格关键词：**Sci-fi HUD · 深空夜蓝 · 青/电蓝辉光 · 玻璃拟态 · 细线极简 · 冷静高级**。

---

## 1. 色彩 Color Tokens

### 背景 Background
| Token | 值 | 用途 |
|---|---|---|
| `--bg-base` | `#0A0E1A` | 全局深空底色 |
| `--bg-elevated` | `#0F1626` | 卡片/面板底 |
| `--bg-panel` | `rgba(18, 26, 44, 0.55)` | 玻璃面板底（配 blur） |
| `--bg-overlay` | `rgba(5, 8, 16, 0.7)` | 弹层/遮罩 |

### 主色 / 辉光 Accent & Glow
| Token | 值 | 用途 |
|---|---|---|
| `--accent-cyan` | `#22D3EE` | 主强调色、激活态、波形 |
| `--accent-blue` | `#3B82F6` | 次强调、链接、边 |
| `--glow-cyan` | `0 0 16px rgba(34,211,238,0.55)` | 节点/按钮辉光 |
| `--glow-soft` | `0 0 40px rgba(59,130,246,0.25)` | 大面积 bloom 氛围光 |

### 语义色 Semantic（自检/状态）
| Token | 值 | 用途 |
|---|---|---|
| `--status-ok` | `#34D399` | 自检通过 ✓、正常 |
| `--status-pending` | `#64748B` | 待执行、灰待命 |
| `--status-syncing` | `#22D3EE` | 进行中（脉冲动画） |
| `--status-warn` | `#FBBF24` | 警告 |
| `--status-error` | `#F87171` | 错误 |

### 图谱节点分层色 Graph Node Clusters
> 知识图谱按聚类用 4 个色相区分（呼应主界面图），节点本体辉光、连线半透明同色。
| Token | 值 |
|---|---|
| `--node-cyan` | `#22D3EE` |
| `--node-blue` | `#3B82F6` |
| `--node-violet` | `#A78BFA` |
| `--node-amber` | `#F59E0B` |
| `--edge` | `rgba(120,160,220,0.25)` |

### 文字 Text
| Token | 值 | 用途 |
|---|---|---|
| `--text-primary` | `#E6EDF7` | 主要文字 |
| `--text-secondary` | `#9AACC4` | 次要/说明 |
| `--text-muted` | `#5C6B85` | 占位、禁用 |

---

## 2. 字体 Typography

- **字族**：细体无衬线。中文 `"PingFang SC", "Microsoft YaHei", system-ui`；英文/数字优先 `"Inter", "Rajdhani"`（Rajdhani 用于 HUD 数字/标题更出科技感）。
- **字重**：标题 500，正文 400，HUD 标签 300–400 + `letter-spacing: 0.08em` 大写。
- **比例（rem，base 16px）**：
  | Token | size / line-height | 用途 |
  |---|---|---|
  | `--text-display` | 28 / 36 | 启动标题 "INITIALIZING SECOND BRAIN" |
  | `--text-h1` | 20 / 28 | 区域标题 |
  | `--text-h2` | 16 / 24 | 卡片标题 |
  | `--text-body` | 14 / 22 | 正文、对话气泡 |
  | `--text-label` | 12 / 16 | HUD 标签、状态 |
  | `--text-caption`| 11 / 14 | 脚注、统计单位 |

---

## 3. 间距 / 圆角 / 描边 Spacing · Radius · Border

- **间距阶梯**（8px 基准）：`4 / 8 / 12 / 16 / 24 / 32 / 48`，token `--space-1 … --space-7`。
- **圆角**：`--radius-sm: 6px`（按钮/标签）、`--radius-md: 12px`（卡片/面板）、`--radius-full: 999px`（语音球/胶囊）。
- **描边**（HUD 细线）：`--border-hud: 1px solid rgba(120,160,220,0.20)`；激活态 `1px solid var(--accent-cyan)`。

---

## 4. 玻璃拟态 Glassmorphism（面板统一规范）

所有面板（自检列表卡、语音面板、统计卡）统一用：
```
background: var(--bg-panel);
backdrop-filter: blur(16px);
border: var(--border-hud);
border-radius: var(--radius-md);
box-shadow: var(--glow-soft), inset 0 1px 0 rgba(255,255,255,0.04);
```

---

## 5. 布局 Layout（主界面栅格）

- **整体**：左 **2/3** 知识图谱画布 + 右 **1/3** 语音交互区；最左可选窄侧栏（导航图标，宽 `64px`，可折叠）。
- **断点**：≥1280 三栏；1024–1280 收起左侧导航为图标条；<1024 语音区折叠为底部抽屉（MVP 以桌面优先）。
- **图谱区**：满高画布 + 右下角缩放控件 + 左下角小地图(minimap) + 右侧"层级"滑杆（呼应 PRODUCT 的 layered/zoomable）。
- **语音区（上→下）**：① 反应式波形/语音球 ② 对话转写气泡流（AI 左、用户右） ③ 底部"正在聆听…松开空格结束"状态条。

---

## 6. 动效 Motion

| 场景 | 规范 |
|---|---|
| 启动自检 | 诊断项**逐条**点亮（每项 stagger 150–250ms），✓ 淡入 + 轻微上移 8px；中央神经核 orb 呼吸光环 2.5s 循环 |
| 进行中状态 | `--status-syncing` 环形旋转 1.2s linear infinite |
| 节点 hover/选中 | 辉光增强 + scale 1.06，150ms ease-out |
| 语音聆听 | 波形随音量实时跳动；语音球呼吸脉冲 1.5s |
| 转场 | 页面/弹层 200ms ease，遵循"快进慢出"；**禁止**超过 300ms 的大幅位移，保持冷静高级感 |
| 无障碍 | 尊重 `prefers-reduced-motion`，关闭循环动画只留状态色变化 |

---

## 7. 核心组件清单（按 MVP 优先级）

1. **BootSelfCheck**：神经核 orb + 诊断清单（ok/pending/syncing）+ 进度条 + 系统日志流。
2. **BrainGraph**：force-directed 画布、节点（含分层色/辉光/标签）、边、缩放/层级控件、minimap。
3. **VoicePanel**：波形/语音球、转写气泡流、聆听状态条。
4. **GlassCard**：通用玻璃面板容器（统计、设置等复用）。
5. **SuggestConfirmDialog**：图谱变更"建议→确认"弹层（合并/归档/连边/入库 "入库?"）——**产品不变量的 UI 载体，必须高可辨识**。
6. **NavRail**：左侧可折叠图标导航。

---

## 8. 不可违反的设计约束（呼应 AGENTS.md 不变量）

- **suggest-then-confirm 必须可见**：任何图谱变更都走 `SuggestConfirmDialog`，绝不静默改图；确认/取消按钮永远成对、确认态用 `--accent-cyan`。
- **"入库?" 逐条确认**：AI 资源入库走单条确认卡，不批量默认勾选。
- **删除=归档语义**：归档态节点降透明度（opacity 0.35）+ 去辉光，不从画布消失（除非用户隐藏）。
- **中文 UI**：所有界面文案 zh-CN，技术术语保留英文（如 "Transformer"），呼应 EN→ZH 处理原则。
- **隐私无声明**：UI 不展示任何原始音频/全文留存入口，只呈现"概念+短介绍+来源链接"。

---

## 9. 落地方式（Tailwind）

将以上 token 写入 `tailwind.config` 的 `theme.extend`（colors / spacing / borderRadius / boxShadow / fontFamily / fontSize）与一个 `:root` CSS 变量层；组件只允许引用 token 类名（如 `bg-bg-base`、`text-accent-cyan`、`shadow-glow-cyan`），**严禁**在组件里写魔法色值/魔法间距。
