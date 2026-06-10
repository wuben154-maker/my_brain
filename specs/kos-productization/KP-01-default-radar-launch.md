# KP-01 — Radar 默认启动路径（`default-radar-launch`）

- **阶段：** KP Phase 1 · **状态：** planned
- **上游：** KP-00、KOS-B1/B2/B3 · **下游：** KP-02、KP-04、KP-09
- **依赖 / 前置里程碑：** **KP-00 PASS**；KOS-B3 daily-briefing harness 已实现
- **可并行性：** 与 KP-02 后半可分工（launch 逻辑 vs companion UI）；均依赖 KP-00

## 定位

把 Radar briefing 提升为 **无 query flag 时的默认 mock-first 启动路径**：打开 App 即生成「今日 top 3 最值得知道的变化」。`?showcase=1` 保留；RSS flatten 仅 fallback/legacy，**不是主体验**。

## 目标

1. 在 `runLaunchSequence` 中：**无 flag → Radar briefing 默认路径**（mock-first）。
2. 保留 `?showcase=1` 作品演示模式，行为与 KOS-A1/A2 脚本一致。
3. 普通 RSS flatten **仅**在 Radar/source 失败时承接，不得作为默认队列。
4. 接入 KOS-B2/B3：`selectDailyBriefing` → top 3 + RadarSignal；`WorldItem` 不写永久图谱。
5. **live source smoke**：至少一个真实联网 source（无需 API key 的 GitHub public API 或公开 RSS）在真实网络下返回数据并完成 ranking（允许手动执行并记录证据；网络失败时降级 fallback 不算 FAIL，但须至少成功记录过一次）。fixture-adapter 仅作结构回归，**不能替代** live source 证据。
6. **ranking golden 扩充**：继承蓝图 Milestone B 五类 fixture 评测集——至少 20 条 `WorldItem`，覆盖「明显相关、弱相关、无关、重复、过时」五类，作为 `RADAR_RANKING_GOLDEN` 的硬验收基线。
7. README/DEMO 口径与默认体验裁定一致。

## 非目标

- 不在本 spec 完成 companion card UI（KP-02）；可暂投影 `newsQueue` 兼容。
- 不改 Weekly Review 入口（KP-03）。
- 不持久化 feedback 跨会话（KP-04）。
- 不扩展 graph schema。

## 涉及文件/模块

```
src/lib/runLaunchSequence.ts              # 默认 Radar 路径；showcase/fallback 分支
src/radar/selectDailyBriefing.ts          # 复用 KOS-B3
src/stores/briefingStore.ts               # todayItems
src/stores/appStore.ts                    # newsQueue 投影（legacy 兼容）
src/showcase/showcaseCompanionScript.ts   # ?showcase=1 不变
src/providers/news/*                      # source 成功/失败路径
README.md                                 # 仓库根；默认体验裁定（KP-06 同步，此处先改关键句）
```

## 用户可见流程或数据流

```
正常启动（无 flag）
  → runLaunchSequence: mock-first Radar
  → try live WorldSource → on fail → fixture fallback（非 flatten 主路径）
  → selectDailyBriefing(max:3) + signals
  → briefingStore / newsQueue 投影
  → companion phase（KP-02 展示 signal）

?showcase=1
  → A1 curated 演示流（不受影响）

source 全失败
  → mock-first 仍 3 条；RSS flatten 仅最后 legacy 兜底
```

## 验收清单

- [ ] **无 flag** 启动后 briefing 可见 top 3（mock-first 可 demo）。
- [ ] 每条 top 3 关联 ≥1 `RadarSignal`（数据层；UI 见 KP-02）。
- [ ] 无关项不进 top 3（KOS-B2 golden 仍绿）。
- [ ] **`WorldItem` 不直写** `KnowledgeGraph`。
- [ ] `?showcase=1` 全流程与 KOS-A2 一致，无回归。
- [ ] RSS flatten **不是**无 flag 默认入口；仅 fallback/legacy 文档与代码一致。
- [ ] source 失败：仍进入 companion，fixture/mock 3 条，phase ≠ error（除非全链路失败）。
- [ ] **live source smoke**：至少一个真实联网 source（GitHub public API 或公开 RSS）在真实网络下成功返回并完成 ranking；附证据（日志/截图/日期）；网络不可用时可降级，但须曾成功记录过一次。
- [ ] **ranking golden**：≥20 条 `WorldItem` fixture，覆盖「明显相关、弱相关、无关、重复、过时」五类；golden 测试绿。
- [ ] README 或 DEMO 一句明确：默认 Radar ≠ showcase ≠ legacy flatten。

## 不变量与权限边界

- 入库 = 用户语音确认；launch 路径不得 create 节点。
- Brain MCP 只读；briefing 路径无 graph write。
- MemoryProvider 不写图谱/画像。
- showcase 与默认路径隔离，互不覆盖 query 解析。

## 测试 / 验证命令

```bash
pnpm test -- runLaunchSequence selectDailyBriefing dailyBriefing radarLaunch
pnpm test -- showcaseCoreLoop
pnpm test -- sourceFailureRecovery
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 仍默认走 newsQueue flatten | launch 分支单测断言无 flag → radar path |
| showcase 被 Radar 破坏 | showcase 专用 integration 回归 |
| 无法解释「为何和我有关」 | 依赖 B2 signals；STOP 见下 |

**Stop condition：** 默认 Radar 不能稳定解释「为什么这 3 条和我有关」（signals 缺失或 ranking 不可信）→ **不进入 schema 扩展（KP-08+）**。

## Skill 使用要求

- **规划期（必须）：** `/plan-design-review`。
- **落地后（必须）：** `design-review` + `qa`（launch 虽偏逻辑，但影响首屏体验）。

---

## Harness 验收协议

### Scope

- **做：** 无 flag 默认 Radar、showcase 隔离、source fail fallback、WorldItem 不写图谱。
- **不做：** companion card 视觉（KP-02）、feedback 持久化（KP-04）。

### Input fixtures

- KOS-B2 `RADAR_RANKING_GOLDEN`（**扩充**：≥20 条 `WorldItem`，五类覆盖——明显相关、弱相关、无关、重复、过时）
- KOS-A1 `SHOWCASE_*`
- Live source smoke：GitHub public API 或公开 RSS（真实网络；附证据）
- Mock failing live source + fixture fallback（结构回归，不替代 live smoke）

### User actions

1. 无 query 启动 → 等待 companion phase。
2. `?showcase=1` 启动 → 跑 showcase script。
3. Mock live source 失败 → 再启动。

### Expected observations

| 场景 | 观测 |
|------|------|
| 默认 | briefingStore 3 条；每条有 signals |
| showcase | 与 A2 golden 一致 |
| source fail | warn 日志；仍 3 条 mock/fixture |

### Assertions

```text
Given no query flag
When launch completes
Then briefing path === radar mock-first
And todayItems.length === 3
And each item has signals.length >= 1
And no KnowledgeNode created
When ?showcase=1
Then briefing path === showcase (A1 script)
And RSS flatten is NOT the primary branch without flag
```

### Forbidden behaviors

- 无 flag 默认 RSS flatten 队列为主体验。
- Launch 静默 create 图谱节点。
- Live 失败且无 fallback 时仍假成功 3 条空壳。
- showcase 模式被 Radar 默认逻辑覆盖。

### Failure recovery

| 失败 | 行为 |
|------|------|
| ranking 空 | 空态文案；conductor 进闲聊，不 error 整 app |
| 双路径冲突 | query 解析优先级：showcase > explicit radar flag > default radar |

### Verification command

```bash
pnpm test -- runLaunchSequence selectDailyBriefing showcaseCoreLoop sourceFailureRecovery
pnpm check
```
