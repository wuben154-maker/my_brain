# V2 视觉设计契约（图 → 代码 精准还原）

> **这份文档的存在意义**：直接把概念图甩给 AI"照着写"必然失真——图是模糊的，模型只能凭感觉。本文件把三张概念图翻译成**可量化的设计契约 + 可像素验证的回环**。让 composer **实现"契约里的数字"，并对着 `pnpm visual:loop` 的像素 diff 自我纠偏**，而不是凭感觉发挥。
>
> **概念图（视觉北极星，勿当像素指令直接抄）**：
> - 开机：`assets/companion-boot.png`
> - 语音自检：`assets/companion-selfcheck.png`
> - 伴侣主场：`assets/companion-main.png`
>
> 关联里程碑：V0（外壳 + token + `?visual=companion-main` 脚手架）、V1（开机/自检两屏 + 其快照）、V6（星图打磨 + CI 基线由 `main`→`companion` 切换，见 `specs/README.md` 裁定 #4）。

---

## 0. 给 composer 的硬规矩（务必照做，杜绝踩坑）
1. **先实现 token，再搭布局，最后调动效**——顺序不能反。
2. **实现本文件的数字（hex / px / 比例 / 组件树），不要"凭图的氛围"自由发挥。**
3. **以像素 diff 为唯一过关标准**：对应 `?visual=` 快照跑 `pnpm visual:loop --watch`，循环改 `src/index.css`/组件，直到 diff 低于阈值（见 §5）。
4. 不准新增导航栏/顶栏/卡片列表/收件箱——v2 是**沉浸式单画面**。
5. 动效与力导向随机性必须在 `?visual=` 快照里**冻结**（固定坐标/相位），否则 diff 不稳。

---

## 1. 设计 Token（写进 Tailwind theme + `src/index.css` CSS 变量）

### 1.1 色板
| 角色 | 变量 | Hex |
|---|---|---|
| 基底背景（最深） | `--bg-base` | `#05060A` |
| 背景渐变远端 | `--bg-deep` | `#0A0E1F` |
| 玻璃面板底 | `--panel` | `rgba(18,26,48,0.55)` |
| 主强调·青 | `--accent-cyan` | `#3BE8E0` |
| 次强调·青暗 | `--accent-cyan-dim` | `#2BB6C9` |
| 主强调·紫 | `--accent-violet` | `#8B7BFF` |
| 次强调·紫深 | `--accent-violet-deep` | `#6C5CE7` |
| 星辰高光 | `--star` | `#EAFBFF` |
| 正文字 | `--text-primary` | `#EAF2FF` |
| 次要字 | `--text-secondary` | `#8FA0C0` |
| 弱化字 | `--text-muted` | `#5A6B86` |
| 状态·成功 | `--ok` | `#4ADE9B` |
| 状态·错误 | `--err` | `#FF6B7A` |

### 1.2 关系线配色（星图连线，对应 `companion-main` 左下角图例）
| 关系 | 颜色 | 线型 |
|---|---|---|
| 因果关系 | `#4A6BFF` | 实线 |
| 相关关系 | `#3BE8E0` | 虚线 |
| 影响关系 | `#4ADE9B` | 实线细 |
| 包含关系 | `#2BB6C9` | 实线 |
| 时间关系 | `#8B7BFF` | 实线 |
| 情感连接 | `#C77DFF` | 虚线 |
> 接入 `src/lib/graphVisualTokens.ts`，**关系类型少而精**（不变量 #4）。

### 1.3 字体与字号
- 拉丁/数字：`Inter` 或系统等宽 HUD 体；中文：干净无衬线（系统 `-apple-system/Segoe UI/Noto Sans SC`）。
- 尺度（rem）：`hud-label .75 / body .875 / node-label .8125 / section 1.125 / hero 1.5`；HUD 标签 `letter-spacing: .18em` + 全大写。
- 发光文字：`text-shadow: 0 0 8px color/60%`，仅用于强调（wordmark、节点名、自检通过项）。

### 1.4 间距 / 圆角 / 玻璃
- 间距尺度：`4 / 8 / 12 / 16 / 24 / 32 / 48`。
- 圆角：面板 `14px`；HUD 切角面板可用 `clip-path` 做斜切角。
- 玻璃面板：`background: var(--panel); backdrop-filter: blur(14px); border: 1px solid rgba(59,232,224,.18);` + 外发光 `box-shadow: 0 0 24px rgba(59,232,224,.08)`。

---

## 2. 屏 A · 开机（`companion-boot.png`）
**布局契约**
- 全屏 `--bg-base`，径向渐变中心略偏上：`radial-gradient(60% 50% at 50% 42%, #0B1026 0%, #05060A 70%)`。
- 中央：神经星座（复用 `BrainGraphView`/3D 的"汇聚态"——粒子从四周向中心收拢，中心最亮节点）。占屏约 `55% 宽 / 60% 高`，水平居中、垂直中心略偏上（中心点约 `y=46%`）。
- 底部居中 wordmark `my_brain`：`y≈88%`，字号 `hud-label`，`letter-spacing:.4em`，青色发光，下有一条 1px 渐隐青线。
- **无任何 chrome**。
**动效**：粒子 2.5s 汇聚 + 中心呼吸光晕；快照 `?visual=companion-boot` 固定在"汇聚完成帧"。

## 3. 屏 B · 语音自检（`companion-selfcheck.png`）
**布局契约（两栏）**
- 顶部细 HUD 条：左 `VOICE SYSTEM CHECK`，右几根装饰竖条 + 状态点；高 `≈40px`，`hud-label`。
- 左/中：**语音波形球**——一个发光球体（直径约 `viewport min * .32`），中线穿过一条紫→青声波（复用语音光球组件的"播报态"）。球下方居中文案 `语音播报自检中…` + 三个脉冲点。
- 右：玻璃面板（宽 `≈360px`，右距 `48px`，垂直居中），内含 **5 行自检项**，行高 `≈84px`，行间 1px 分隔线：
  - 每行：左侧圆形发光指示灯（`28px`）+ 主标签（`section` 字号，`--text-primary`）+ 次标签（`hud-label`，`--text-muted`）。
  - 标签顺序固定：`麦克风 / 扬声器 / 网络 / 资讯源 / 大脑读写`（对齐 `lib/bootSelfCheck.ts` 的自检项）。
  - 已通过：青色对勾 + `检测通过`；进行中：紫色脉冲环 + `检测中…`；失败：`--err` + 错因（语音同步播报）。
- 底部细 HUD：左 `VSC-2025`，右 `● NEURAL LINK STABLE`。
**动效**：自检项**逐条点亮**并与语音播报同步（V1 的 `speakSelfCheck` 每念完一项点亮一项）；快照固定在"4 通过 + 第 5 项检测中"。

## 4. 屏 C · 伴侣主场（`companion-main.png`）★核心
**布局契约**
- **全屏铺满**，无导航栏/顶栏。根布局：`grid-cols-[minmax(0,1fr)_minmax(280px,360px)]` 或绝对定位——左 ≈70% 星图，右 ≈30% 语音光球。
- **左：知识星图**（`BrainGraphView`/3D 主画布）——发光概念节点（星辰）+ 细弧形关系线；中央一颗**最亮的"第一颗星"**（冷启动点亮的首节点 / 用户自身节点）。节点名 `node-label` 字号、按节点色发光。
- **右：语音光球**——直径 `≈220px` 的柔光球（径向 `紫核→青环`），两侧各一组水平声波条（`±` 对称，随说话律动）；垂直居中，右距 `≈64px`。
- **左下：关系图例**——6 行（§1.2 六种关系），每行一段彩色线样 + 中文标签（`hud-label`）。
- **右上：设置齿轮**——单个 `≈24px` 图标，`top:20px;right:20px`，hover 微亮；点开 = `SettingsOverlay` 浮层（音色/人格/验收期 key）。**这是主场唯一的"按钮"。**
- 悬停节点：高亮该节点、无关变暗、相连线浮现标签 + 简短概要浮层（不变量：信息按需浮现）。
**动效**：节点缓慢漂浮 + 光球随语音律动；串讲时节点/连线随语音同步高亮（V6 `useWalkthroughHighlight`）。快照 `?visual=companion-main` 用**固定 demo 图谱坐标**（复用现有确定性 demo 机制）。

---

## 5. 像素验证回环（让"准确"可度量）

### 5.1 可复现快照 URL（V0/V1 实现，确定性、关随机）
- `?visual=companion-boot` → 屏 A 汇聚完成帧
- `?visual=companion-selfcheck` → 屏 B（4 通过 + 1 进行中）
- `?visual=companion-main` → 屏 C（固定 demo 图谱坐标 + 光球固定相位）

### 5.2 基线与对比配置
- 基线 PNG：本目录引用的 `assets/companion-*.png`（开发期即以它们为目标）。
- 在 `scripts/visual-feedback/config.mjs` 增 `companion-*` 三个条目，给**对比区域裁剪 + 阈值**：
  - 星图主体（漂浮/力导随机大）→ 阈值宽松 `≈30%`，主要比"整体明暗/布局占位/光球位置"。
  - 右侧光球、右侧自检面板、HUD 条、wordmark → 阈值收紧 `≈12%`，比结构与配色。
- **CI 基线切换**：开发期 `visual:loop` 即用 companion 基线；CI 正式基线按裁定 #4 在 **V6** 由 `main`→`companion`，**V7** 退役 `?visual=main`。

### 5.3 composer 的迭代命令
```bash
pnpm visual:browser           # 一次性装 Chromium
pnpm visual:loop --watch      # 截图→对比→改 CSS→自动重跑，直到连续 2 轮 < 阈值
```

---

## 6. 喂 composer 的标准 prompt（实现某一屏时照抄）
```
实现 {V0/V1/V6} 的 {屏名} UI。三件套为准：
① 概念图 assets/companion-{boot|selfcheck|main}.png（只看调性）
② docs/V2_VISUAL_SPEC.md 的 token 与该屏「布局契约」（实现这些数字，别凭感觉）
③ 以 pnpm visual:loop --watch 对 ?visual=companion-{...} 的像素 diff 为过关标准。
先把 §1 token 落进 Tailwind/index.css，再按布局契约搭组件，最后调动效；
快照里冻结动画/力导随机。循环到 diff < 阈值且 pnpm check 全绿，逐条贴证据。
不新增导航栏/顶栏/卡片/收件箱。
```
