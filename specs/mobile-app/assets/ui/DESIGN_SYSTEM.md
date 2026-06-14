# my_brain Mobile — Design System

> **来源**：`mobile-app-design-pro` Phase 1 交互确认 + `docs/MOBILE_PRODUCT_PLAN.md`  
> **版本**：v2.0 · 2026-06-12（推翻 v1 HUD 科幻稿）  
> **画布**：390×844（@3x → 1170×2532）· Expo / React Native · zh-CN UI  
> **状态**：主题系统已定稿；HTML/PNG 参考稿待屏幕规格确认后生成

---

## 1. 产品画像

| 维度 | 结论 |
|------|------|
| **产品类型** | 通用型自进化 AI 伴侣 / 个人大脑（非资讯 App、非聊天列表 App） |
| **核心差异** | User Evolution-first：冷启动识别用户 → 动态今日入口；越用越懂 |
| **平台** | iOS + Android（Expo RN） |
| **情绪基调** | 温暖伴侣感 — 私人空间、可信赖、有呼吸感；炫酷来自**关系与记忆**，非仪表盘 |
| **气质参考** | Things 3（克制优雅）· Arc（深色个性色块）· 《她》（亲密未来感）· Headspace（仪式感与呼吸） |
| **技术栈** | Reanimated + Skia + NativeWind；参考稿可用 HTML/CSS 复刻 |

### 主题引擎匹配

| 引擎规则 | 应用方式 |
|----------|----------|
| #44 Voice-First | 底栏柔和光球 + 口语化三意图；文字兜底同级可见 |
| Productivity (#47) | Things 式间距、层级、少而强主路径 |
| Health/Wellness (#25) | Headspace 式慢动效、非恐吓性错误态 |
| AI/Tech (#7) | 智能感用**微光与响应**，不用霓虹 HUD |

```
┌──────────────────────────────────────────────────────────┐
│  DESIGN SYSTEM for my_brain Mobile v2                    │
├──────────────────────────────────────────────────────────┤
│  CATEGORY:    Personal AI Companion / Living Brain       │
│  PATTERN:     Zero Interface — 单主场景，无底部 Tab       │
│  STYLE:       Warm Companion + Arc Personality Accent      │
│                                                          │
│  THEMES:      Light (日间默认可选) + Dark (夜间/偏好)     │
│                                                          │
│  COLORS (Dark):                                          │
│    Background:  #14161C (Warm Ink)                       │
│    Surface:       #1E2129 (Mist Panel)                     │
│    Primary:       #7B8CFF (Companion Indigo)             │
│    Accent:        #FF8A7A (Warm Coral — 峰值/点亮)        │
│    Text:          #F4F2EF (Soft Ivory)                   │
│    TextMuted:     #9BA3B4 (Haze)                         │
│                                                          │
│  COLORS (Light):                                         │
│    Background:  #F7F5F2 (Morning Linen)                  │
│    Surface:       #FFFFFF (Cloud Card)                     │
│    Primary:       #5B6FE8 (Day Indigo)                   │
│    Accent:        #E86B5A (Day Coral)                      │
│    Text:          #1A1D24 (Ink)                            │
│    TextMuted:     #6B7280 (Stone)                        │
│                                                          │
│  TYPOGRAPHY:  DM Sans / Noto Sans SC                      │
│    Mood: 柔和几何 sans + 中文正文；无 HUD 等宽标签风       │
│                                                          │
│  MOTION:                                                 │
│    Core breath: 3.6s ease-in-out                         │
│    Voice orb pulse: 2.4s                                 │
│    Node bloom (入库): 520ms soft scale + glow            │
│    Screen: fade 240ms cubic-bezier(0.25, 0.1, 0.25, 1)   │
│                                                          │
│  COPY TONE: 口语化、第二人称「你」、避免军规/缩写         │
│    三意图：记住这个 · 先不用 · 多说点                     │
│                                                          │
│  ANTI-PATTERNS (v1 作废项):                              │
│    ✗ HUD 切角面板、霓虹青紫、Boot Sequence 军规文案        │
│    ✗ 首页固定「今日雷达 Top3」或 AI 资讯列表              │
│    ✗ INGEST/SKIP/DETAIL、波形装饰语音球                  │
│    ✗ 底部 5 Tab、Mock 静默伪装 live                      │
│    ✗ Space Grotesk + 仪表盘数据条美学                    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 双主题色彩令牌

### 2.1 Dark — `brainTheme.dark`

| 令牌 | Hex | 用途 |
|------|-----|------|
| `background` | `#14161C` | 全屏底；暖调墨蓝，非冷黑 |
| `backgroundElevated` | `#1A1D26` | 渐变深处、星图空域 |
| `surface` | `#1E2129` | 卡片、情境区底板 |
| `surfaceMuted` | `#252932` | 次要分组、输入区底 |
| `primary` | `#7B8CFF` | 主 CTA、光球核心、链接 |
| `primaryMuted` | `#7B8CFF14` | 选中底、轻强调（8%） |
| `accent` | `#FF8A7A` | 入库点亮、峰值反馈、待点亮星 |
| `accentMuted` | `#FF8A7A18` | 温暖光晕（10%） |
| `text` | `#F4F2EF` | 标题、正文 |
| `textSecondary` | `#9BA3B4` | 辅助说明 |
| `textTertiary` | `#6B7280` | 占位、时间戳 |
| `border` | `#FFFFFF12` | 分割线（7% 白） |
| `success` | `#6BC9A8` | 成功、已入库 |
| `warning` | `#E8B86D` | degraded / mock 提示 |
| `error` | `#E87A8A` | 权限/存储错误 |
| `constellationNode` | `#F4F2EF` | 已点亮节点核心 |
| `constellationNodeDim` | `#9BA3B466` | 弱节点 |
| `constellationLine` | `#7B8CFF22` | 连线（13% 主色） |
| `orbGlow` | `#7B8CFF33` | 语音光球外晕 |

### 2.2 Light — `brainTheme.light`

| 令牌 | Hex | 用途 |
|------|-----|------|
| `background` | `#F7F5F2` | 全屏底；亚麻暖白 |
| `backgroundElevated` | `#EFEDE8` | 星图空域浅层 |
| `surface` | `#FFFFFF` | 卡片 |
| `surfaceMuted` | `#F0EEEA` | 次要底板 |
| `primary` | `#5B6FE8` | 主 CTA、光球 |
| `primaryMuted` | `#5B6FE812` | 轻强调 |
| `accent` | `#E86B5A` | 点亮、峰值 |
| `accentMuted` | `#E86B5A14` | 光晕 |
| `text` | `#1A1D24` | 标题、正文 |
| `textSecondary` | `#6B7280` | 辅助 |
| `textTertiary` | `#9CA3AF` | 弱文案 |
| `border` | `#1A1D240F` | 分割线（6% 墨） |
| `success` | `#3D9B7A` | 成功 |
| `warning` | `#C9923E` | degraded |
| `error` | `#D45D6F` | 错误 |
| `constellationNode` | `#1A1D24` | 节点 |
| `constellationNodeDim` | `#9CA3AF88` | 弱节点 |
| `constellationLine` | `#5B6FE820` | 连线 |
| `orbGlow` | `#5B6FE828` | 光球外晕 |

### 2.3 模式强调色（Adaptive Home 情境区）

`UserMode` 不改变全局主题，仅在情境卡片左侧 4px 色条或图标 tint 微调：

| UserMode | Dark tint | Light tint | 气质 |
|----------|-----------|------------|------|
| 技术追踪者 | `#6B9FFF` | `#4A7FE8` | 清晰、信息感 |
| 学习者 | `#9B8CFF` | `#7B6FE8` | 柔和、探索感 |
| 创作者/研究者 | `#FFB87A` | `#E8A05A` | 素材、温暖 |
| 创业/项目型 | `#7BD4A8` | `#4AB88A` | 推进、笃定 |
| 个人记忆/生活型 | `#FF9EC4` | `#E87AA8` | 回忆、亲切 |

---

## 3. 字体

| 角色 | 字体 | 权重 | 用途 |
|------|------|------|------|
| Display | DM Sans | 600 | 屏标题、品牌「my_brain」 |
| Body | Noto Sans SC | 400 | 中文正文、对话 |
| Body Medium | Noto Sans SC | 500 | 按钮、卡片标题 |
| Caption | DM Sans | 500 | 英文标签、数字（ sparingly） |

### 字号阶梯（390 宽基准）

| 令牌 | size | line-height | 用途 |
|------|------|-------------|------|
| `hero` | 28 | 36 | 冷启动邀请语 |
| `title` | 22 | 30 | 屏标题 |
| `body` | 16 | 24 | 正文、对话 |
| `caption` | 13 | 18 | 辅助、状态 |
| `micro` | 11 | 14 | 仅 degraded 条 |

**规则**：全 app 最多 4 档字号 + 2 权重；禁止 HUD 微标注全大写密集排版。

Google Fonts：

```
https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600&family=Noto+Sans+SC:wght@400;500&display=swap
```

---

## 4. 间距与圆角（8pt 网格）

| 令牌 | px | 用途 |
|------|-----|------|
| `xs` | 4 | 图标与文字间隙 |
| `sm` | 8 | 紧凑组内 |
| `md` | 16 | 卡片内边距、组间距 |
| `lg` | 24 | 区块间距 |
| `xl` | 32 | 屏级上下留白 |
| `xxl` | 48 | 空态中央区 |

| 半径 | px | 用途 |
|------|-----|------|
| `sm` | 12 | 小按钮、chip |
| `md` | 16 | 标准卡片 |
| `lg` | 24 | 情境大卡、底栏意图条 |
| `full` | 9999 | 光球、pill |

---

## 5. 阴影与深度

不用硬边阴影； tint 与背景同色温。

**Dark surface 卡片**：

```css
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06);
```

**Light surface 卡片**：

```css
box-shadow: 0 4px 24px rgba(26, 29, 36, 0.06), 0 0 0 1px rgba(26, 29, 36, 0.04);
```

**语音光球**：无实体边框；`orbGlow` 径向渐变 + 3.6s scale 呼吸。

---

## 6. 核心组件规范

### 6.1 柔光星座（ConstellationField）

可滑动、可点选的知识星图视口（非 force-graph 全屏）。

| 属性 | 规格 |
|------|------|
| 高度 | 占屏 **42–48%**（约 360–400px） |
| 视口 | 画布可大于屏宽；左右 **48px 渐隐** + 文案「拖动逛逛」 |
| 节点形态 | **四角星**（`clip-path` 星形或 Skia Path），禁止圆点/方块 |
| 闪烁 | `twinkle` 3–4.5s，`opacity + scale` 轻微起伏；`prefers-reduced-motion` → 静态光晕 |
| 连线 | 1px、`constellationLine` / 模式色 10–20% 透明度 |
| 触达 | 每颗星热区 ≥ **44×44 pt**（视觉可 8–12px，命中区扩大） |

**节点类型**

| 类型 | 视觉 | 含义 |
|------|------|------|
| `pending` | 珊瑚色星 + `coreBreath` 光晕 | 空态待点亮（冷启动前） |
| `warm` | 暖珊瑚星 + `twinkleWarm` | 第一颗由用户点亮 |
| `lit` | 暖白 / 模式色星 + `twinkle` | 已入库概念 |
| `dim` | 低对比星 + 慢闪烁 | 弱相关 / 归档可见 |
| `selected` | 放大 + 模式色环 + 连线至摘要卡 | 用户点选 |

**空态**：中央一颗 `pending` 星；周缘 0–3 颗 `dim` 星。

**有节点**：视口内建议 ≤12 颗可交互星；超出则分页平移加载。

**禁止**：网格底、雷达扫描、数据条、方块节点。

### 6.1.1 点星摘要（NodeSummaryCard）

用户点击星点后浮出；语音主路径不替代，探索时优先展示。

| 元素 | 规格 |
|------|------|
| 位置 | 星图下方，与选中星 **细线连接**（可选） |
| 眉标 | 「你点亮的概念」+ 迷你星标 |
| 标题 | 概念名（`Node.title`） |
| 正文 | 节点 `intro` 1–2 行 |
| 操作 | 「多说点」→ `detail`；「收起」→ 关闭 |
| 叠层 | `AdaptiveContextCard` **弱化至 40–50% opacity**（不隐藏） |
| 空白点击 | 收起摘要，恢复情境卡 |

参考稿：`v2-home-star-tap-reference.html`

### 6.2 语音光球（VoiceOrb）

- 位置：底栏中央偏上，`bottom: safe + 96px`，直径 **72px**
- 态：`idle` 慢呼吸 · `listening` 主色略亮 · `speaking` 外晕扩 8% · `degraded` 外圈 `warning` 细环
- **禁止**内部波形线（横/竖）

### 6.3 三意图条（IntentRail）

- 位置：拇指区，`bottom: safe + 24px`，横向三等分 pill
- 文案（固定口语）：

| 意图 key | 显示文案 | 说明 |
|----------|----------|------|
| `ingest` | 记住这个 | 确认入库 |
| `skip` | 先不用 | 丢弃本轮 |
| `detail` | 多说点 | 展开讲解 |

- 高 48px，间距 8px；选中：`primaryMuted` 底 + `primary` 字

### 6.4 情境卡片（AdaptiveContextCard）

- 冷启动**完成后**才出现；**单卡优先**（非 Top3 列表）
- 圆角 `lg`，内边距 `md`；左侧 4px 模式色条
- 标题 1 行 + 摘要 2 行 max；可右滑「先不用」

### 6.5 Degraded 条（PersistWarning）

- 高 32px，贴顶下或情境卡上方；`warning` 底 12% 透明度
- 文案示例：「现在是演示模式，连上网络后会更好」

---

## 7. 动效

| 名称 | 参数 | 触发 |
|------|------|------|
| `coreBreath` | 3.6s ease-in-out loop | 待点亮星 |
| `twinkle` | 3–4.5s ease-in-out loop | 已点亮星 |
| `twinkleWarm` | 3.4s ease-in-out loop | 第一颗星 |
| `ringPulse` | 2.8s ease-in-out | 选中星环 |
| `orbPulse` | 2.4s ease-in-out | 语音 idle |
| `nodeBloom` | 520ms spring(0.2) | 入库成功 |
| `cardEnter` | 240ms fade + 8px translateY | Adaptive / 摘要卡出现 |
| `themeCrossfade` | 300ms | 日/夜切换 |

**峰值时刻（Peak-End）**：入库 = 节点亮起 + 极轻 haptic + 伴侣一句口语确认（非烟花）。

---

## 8. 布局骨架（390×844）

```
┌─────────────────────────────┐  y=0
│  Status + 可选 degraded 条   │  54 + 32
├─────────────────────────────┤
│                             │
│     ConstellationField      │  ~360px · 可滑动 · 可点星
│     NodeSummaryCard（可选）  │  点星时出现
│                             │
├─────────────────────────────┤
│  AdaptiveContextCard        │  0–120px（冷启动后；模式化）
│  或 ColdStart 对话区         │  冷启动中替代卡片
├─────────────────────────────┤
│         VoiceOrb            │  72px @ bottom 96+safe
├─────────────────────────────┤
│  记住这个 | 先不用 | 多说点   │  48px @ bottom 24+safe
└─────────────────────────────┘
```

- **无底部 Tab**
- 设置/画像：右上轻量图标或长按光球二级入口（M1 规格见 SCREEN_SPECS）

---

## 9. 无障碍

- 正文对比度 ≥ 4.5:1（Light/Dark 均校验 `text` on `background`）
- 触达目标 ≥ 44×44 pt
- 三意图支持文字激活（不仅语音）
- `prefers-reduced-motion`：呼吸改为静态光晕

---

## 10. RN 主题对象（实现参考）

```typescript
export const brainTheme = {
  light: { /* §2.2 令牌 */ },
  dark: { /* §2.1 令牌 */ },
  modeAccent: {
    tech_tracker: { dark: '#6B9FFF', light: '#4A7FE8' },
    learner: { dark: '#9B8CFF', light: '#7B6FE8' },
    creator_researcher: { dark: '#FFB87A', light: '#E8A05A' },
    founder_project: { dark: '#7BD4A8', light: '#4AB88A' },
    personal_memory: { dark: '#FF9EC4', light: '#E87AA8' },
  },
  intentLabels: {
    ingest: '记住这个',
    skip: '先不用',
    detail: '多说点',
  },
} as const;
```

---

## 11. 交付检查清单

- [ ] Light + Dark 均可读，非仅深色稿
- [ ] 首次进入无 AdaptiveRadar 列表
- [ ] 三意图为口语文案
- [ ] 无 HUD/霓虹/资讯 RSS 首页
- [ ] mock/degraded 用户可见
- [x] 星图为四角星闪烁，非方块/圆点占位
- [x] 点星出摘要交互已规格化

---

## 12. 资产目录（v2）

| 文件 | 状态 |
|------|------|
| `DESIGN_SYSTEM.md` | ✅ 本文件 |
| `SCREEN_SPECS.md` | ✅ 屏幕级规格 |
| `README.md` | 目录说明 |
| `*.html` / `*.png` | ✅ 审阅稿（含五模式 + 点星摘要） |
