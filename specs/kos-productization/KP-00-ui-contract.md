# KP-00 — UI Contract 与主路径信息架构（`ui-contract`）

- **阶段：** KP Phase 0 · **状态：** planned
- **上游：** V0–V7、KOS-A2 · **下游：** KP-01、KP-02、KP-03、KP-08+
- **依赖 / 前置里程碑：** V0 沉浸式外壳已实现；**本 spec 是 KOS Productization 第一步**
- **可并行性：** 无；**未完成则禁止启动 Radar 默认路径改造（KP-01+）**

## 定位

先定 v2 主界面如何承载 Radar、RadarSignal 解释、Weekly Review、Action drafts，避免后续每个能力各自长出一套 UI。Phase 0 是 **阻塞性第一步**：UI 承载位置未定清楚则不进入 Phase 1。

## 目标

1. 新增或更新 **UI contract 文档**（建议 `docs/UI_CONTRACT.md` 或等价），明确 `ImmersiveScene` 区域分工。
2. 定义统一 **companion card / overlay shell**：Radar briefing、curation report、weekly review、action draft 共用位置、动效、关闭/返回语义。
3. 钉死主路径 vs 实验入口：`?showcase=1`、legacy fallback、Settings 边界。
4. 约定测试 ID、视觉快照场景、响应式规则。
5. 交付可渲染的 **`CompanionShell` 骨架组件**：含 `radar` / `review` / `action` 三个空 slot demo（可占位，但须可渲染）。
6. 交付 **contract test 定义**：`uiContract` 测试对照 contract 文档列出的 `data-testid`，断言其在 `CompanionShell` / `ImmersiveScene` 渲染输出中存在。
7. 保留「星图主舞台 + 语音光球」v2 主形态；**禁止**恢复多分区 dashboard。

## 非目标

- 不实现 Radar ranking、ingest、auto-curate 业务逻辑（已有 KOS 系列）。
- 不改 launch sequence 默认路径（KP-01）。
- 不扩展 graph schema。
- 不在本 spec 接真 API key。

## 涉及文件/模块

```
docs/UI_CONTRACT.md                         # 新增/更新：主路径 IA 定稿
src/components/shell/ImmersiveScene.tsx     # 区域分工注释 + data-testid 契约
src/components/companion/CompanionShell.tsx # 新增或统一：overlay shell 组件
src/components/voice/VoiceOrb.tsx           # 主交互入口边界
src/components/settings/SettingsOverlay.tsx # 明确「不承载主流程」
assets/companion/*.png                      # visual 基线（若已有 companion 轨）
```

### 主界面信息架构（定稿）

| 区域 | 职责 | 边界 |
|------|------|------|
| 星图主舞台 | force-directed 图谱，zoom/pan，入库后节点点亮 | 主视觉，不可被 dashboard 替代 |
| 语音光球 | 实时语音、barge-in、入库确认「入/不要/讲细点」 | 主交互入口 |
| Radar companion card/overlay | 今日 top 3、RadarSignal、briefing 状态 | 统一 shell，非独立页面 |
| Weekly Review overlay | 本周认知变化、graph history、薄弱点 | 入库/整理后自然后续，非设置子页 |
| Action drafts | 行动建议草稿、preview、draft-only | 不可默认执行外部写操作 |
| Settings | API key、persona、实验开关 | **不承载** Radar/Review/Action 主入口 |

## 用户可见流程或数据流

```
启动 → ImmersiveScene（星图 + 光球）
  ├─ companion shell 可承载：Radar / Curation report / Weekly Review / Action draft
  ├─ 用户无需打开 Settings 即可发现 Radar → 入库 → Review 主闭环入口
  └─ ?showcase=1 走演示路径（contract 中单独标注，非默认）
```

## 验收清单

- [ ] UI contract 文档存在且与 `ImmersiveScene` 区域分工一致。
- [ ] Radar、Weekly Review、Action drafts 在 contract 中有 **明确承载区域**（即使 UI 尚未实现，slot 已定义）。
- [ ] 用户 **不用打开 Settings** 也能在 contract 图上发现主闭环能力入口。
- [ ] contract 区分三条路径：**Radar 默认** / `?showcase=1` / RSS flatten legacy fallback。
- [ ] 视觉主形态仍是沉浸式星图，contract 禁止 dashboard 式多 tab 导航。
- [ ] companion shell 的 open/close/back 语义对 Radar、Review、Action 一致。
- [ ] 相关 UI 单测或 snapshot test ID 写入 contract。
- [ ] **`CompanionShell` 骨架**可渲染，含 radar / review / action 三个空 slot demo。
- [ ] **`uiContract` 测试**：contract 文档列出的 `data-testid` 在 `CompanionShell` / `ImmersiveScene` 渲染输出中存在（非仅文档存在）。
- [ ] `spec-acceptance-review` 对 Phase 0 返回 PASS。

## 不变量与权限边界

- 入库仍仅用户语音确认；UI contract 不得设计静默 create 入口。
- Settings 不得成为 Radar/Review 唯一入口。
- MemoryProvider / Brain MCP 边界不在 UI 层暴露写能力。
- legacy RSS flatten 在 contract 中标注为 fallback，非默认。

## 测试 / 验证命令

```bash
# 规划期：/plan-design-review 完成并记录裁定
pnpm test -- ImmersiveScene CompanionShell uiContract
pnpm visual:loop --companion   # 或 companion visual smoke
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| Radar/Review/Action 各做一套 overlay | 强制共用 CompanionShell |
| contract 与代码 drift | contract 含 testid 表；PR 须双向更新 |
| 恢复 dashboard 诱惑 | contract 显式禁止 + review checklist |

**Stop condition：** UI 承载位置未在 contract 中定清楚 → **不进入 KP-01**；否则 Radar、Review、Action 会继续各自长 UI。

## Skill 使用要求

- **规划期（必须）：** `/plan-design-review`（或项目内 `plan-design-review` skill），记录裁定。
- **落地后（必须）：** `design-review` + `qa`（或 `pnpm visual:loop --companion` companion visual smoke）。
- **验收：** `spec-acceptance-review` lite PASS。

---

## Harness 验收协议

### Scope

- **做：** UI contract 文档、CompanionShell 骨架（三 slot demo）、contract test（testid 渲染对照）、ImmersiveScene 区域 testid、主路径 vs showcase vs legacy 口径。
- **不做：** Radar 默认 launch（KP-01）、briefing 内容（KP-02）、Review 内容（KP-03）。

### Input fixtures

- 现有 V0 `ImmersiveScene` 挂载态
- `?showcase=1` query 标注（contract 层）
- 空图谱 / 有节点图谱两种 visual 场景

### User actions

1. 阅读 UI contract，对照 mock 启动 ImmersiveScene。
2. 在 contract 图上 trace：Radar 入口 → 光球 → Review 入口 → Action draft 区域。
3. 确认 Settings 仅含实验/配置项。

### Expected observations

| 观测 | 期望 |
|------|------|
| 默认布局 | 全屏星图 + 光球 + 角落设置；无 NavRail |
| companion shell | 文档定义统一 slot（位置/层级/z-index） |
| 实验入口 | showcase 与 legacy 在文档中单独章节 |

### Assertions

```text
Given UI contract merged
When ImmersiveScene renders in companion phase
Then data-testid="immersive-scene" and voice-orb present
And contract lists companion-shell slot for radar|review|action
And contract states Settings is NOT sole entry for Radar or Review
```

### Forbidden behaviors

- contract 将 RSS flatten 或 showcase 标为默认主体验。
- contract 设计多分区 dashboard 为主路径。
- 无 contract 文档即启动 KP-01 实现。

### Failure recovery

| 失败 | 行为 |
|------|------|
| shell 语义不一致 | 回退到单一 CompanionShell MVP，禁止多 overlay 并存 |
| visual smoke 失败 | 冻结 IA，先修 contract/testid 再开发 |

### Verification command

```bash
pnpm test -- ImmersiveScene uiContract
pnpm visual:loop --companion
pnpm check
```
