# KP-02 — Radar Companion UI（`radar-companion-ui`）

- **阶段：** KP Phase 1 · **状态：** planned
- **上游：** KP-00、KP-01 · **下游：** KP-04、KP-09
- **依赖 / 前置里程碑：** KP-00 UI contract；KP-01 默认 launch 有 top 3 数据
- **可并行性：** KP-01 launch 合并后可并行 UI 壳；**展示依赖 briefing 数据**

## 定位

把 `BriefingSignalChip` 的「为什么和我有关」搬进 **v2 主界面 companion shell**，而非仅 legacy `NewsCard`。Radar briefing 状态挂载在 `ImmersiveScene`/语音伴侣层，不只投影成 legacy `newsQueue`。

## 目标

1. 在 KP-00 `CompanionShell` 内展示 Radar top 3 + RadarSignal chips。
2. 每条 briefing 可见 ≥1 条 signal explanation（chip/subtitle/overlay）。
3. briefing 状态与 `VoiceOrb`/conductor 同步（串讲、高亮当前条）。
4. legacy `newsQueue`/`NewsCard` 仍可投影，但 **主体验** 以 companion 为准。
5. 视觉不遮挡星图主舞台（底部 chip 或可 dismiss overlay）。

## 非目标

- 不改 ranking/launch 默认路径（KP-01）。
- 不做 feedback 持久化 UI 完整闭环（KP-04/05）。
- 不做 Weekly Review overlay（KP-03）。
- 不恢复 dashboard 或独立 Radar 页面。

## 涉及文件/模块

```
src/components/shell/ImmersiveScene.tsx
src/components/companion/CompanionShell.tsx      # KP-00
src/components/companion/RadarCompanionCard.tsx  # 新增
src/components/briefing/BriefingSignalChip.tsx     # 复用/扩展
src/conversation/ConversationConductor.ts         # radar 展示 hook
src/stores/briefingStore.ts
```

## 用户可见流程或数据流

```
companion phase
  → CompanionShell 打开（或默认轻量展示 Radar 摘要）
  → 3 条 title + BriefingSignalChip 每条 ≥1
  → 用户点击/语音「讲细点」→ conductor 当前条
  → 关闭 shell 回到星图+光球（语义与 Review/Action 一致）
```

## 验收清单

- [ ] v2 主界面（非 legacy NewsCard）可见 top 3 与 signal explanation。
- [ ] 每条 briefing ≥1 signal chip 或等价 explanation UI。
- [ ] companion shell 符合 KP-00 contract（位置/关闭语义）。
- [ ] showcase 模式 Radar UI 不破坏 A1 脚本观测点。
- [ ] UI 不阻塞星图 zoom/pan；chip 可关闭或折叠。
- [ ] `data-testid` 与 UI contract 一致。
- [ ] **不变量**：UI 无静默入库按钮；ingest 仍语音口令。

## 不变量与权限边界

- UI 仅展示 Suggest 层；不得 one-click create 永久节点。
- Action 区域若同 shell，仍 draft-only 展示。
- Settings 不是 Radar 唯一入口。

## 测试 / 验证命令

```bash
pnpm test -- RadarCompanionCard BriefingSignalChip dailyBriefing.integration
pnpm visual:loop --companion
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 双轨 NewsCard + companion 不一致 | 单一数据源 briefingStore |
| Signal UI 遮挡星图 | 底部 chip + dismiss |
| 只做 legacy UI | 验收必须测 immersive-scene 内 testid |

**Stop condition：** v2 主界面仍无法展示 signal explanation → 与 KP-01 一并 STOP，不进入 KP-03。

## Skill 使用要求

- **规划期：** 随 KP-00/KP-01 已做 design-review 则可增量 review companion 布局。
- **落地后（必须）：** `design-review` + `qa`； companion visual smoke。

---

## Harness 验收协议

### Scope

- **做：** companion 内 top3 + signal UI、conductor 同步、KP-00 shell 一致性。
- **不做：** launch 默认路径、feedback 跨轮持久化。

### Input fixtures

- KP-01 启动后的 briefingStore（3 条 + signals）
- showcase 模式 A1 脚本

### User actions

1. 默认启动 → 在 ImmersiveScene 找到 Radar companion UI。
2. 逐条查看 signal chip 文案。
3. 关闭/ reopen shell；星图仍可交互。

### Expected observations

| 观测 | 期望 |
|------|------|
| top3 | 3 titles visible in companion |
| signals | each row has ≥1 explanation |
| shell | same close/back as contract |

### Assertions

```text
Given radar launch with 3 briefing items
When ImmersiveScene renders
Then radar companion shows 3 items
And each has visible signal explanation
And ingest requires voice confirm (no silent create button)
```

### Forbidden behaviors

- Signal 仅存在于 legacy NewsCard 而不在 v2 companion。
- 全屏 modal 永久挡住星图且无 dismiss。
- UI 触发静默 graph create。

### Failure recovery

| 失败 | 行为 |
|------|------|
| chip 渲染失败 | transcript 内嵌 explanation 降级 |
| shell 崩溃 | 可临时降级 newsQueue 投影 + 日志；**该降级触发即视为 P1 缺陷，必须修复，不得常态化**；**不得**用此降级路径满足「signal 可见」验收 |

### Verification command

```bash
pnpm test -- RadarCompanionCard dailyBriefing.integration
pnpm visual:loop --companion
pnpm check
```
