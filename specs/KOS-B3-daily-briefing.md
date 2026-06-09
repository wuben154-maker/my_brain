# KOS-B3 — Daily Briefing 今日三条（`daily-briefing`）

- **阶段：** KOS-B · **状态：** ✅ 已实现
- **上游：** KOS-B1、KOS-B2、KOS-A2 · **下游：** KOS-C1、KOS-C2
- **复用：** V2 `ConversationConductor` briefing、`ingestActions`、A1 showcase script
- **依赖 / 前置里程碑：** **KOS-B1/B2**；**KOS-A2**（briefing 状态机）
- **可并行性：** UI 反馈 chip 可与 C1 并行；**实现依赖 B2 ranking**

> **定位：** 从 ranked `WorldItem` 选出 **今日 3 条** `BriefingItem`，Companion 串讲，展示 **RadarSignal 解释**，支持 **用户反馈**（不感兴趣/太浅/太深/已知道），并在 source 失败时 **降级不阻塞 demo**。

## 1. 目标

1. 定义 **`BriefingItem`** = `WorldItem` + `signals[]` + `briefingRank`（1–3）。
2. 实现 **`selectDailyBriefing(ranked, { max: 3 })`** → 固定 3 条（deterministic tie-break）。
3. 将 briefing 队列接入 conductor（radar 模式）；showcase 模式仍兼容 A1 三口令脚本。
4. UI/harness：**每条展示至少 1 条 signal explanation**（浮层或 subtitle）。
5. 实现 **`BriefingFeedback`** 写入会话 store，影响 **下一轮** mock 排序权重（可测）。
6. Source 失败：fixture 兜底；live 失败不阻塞 `companion` phase。

## 2. 非目标

- 不重新定义 WorldItem（B1）或 scorer（B2）。
- 不改 V3 三口令与 ingest 门控。
- 不做 LearningTrace 持久化（KOS-C1）。
- 不做 profile 修正 UI（KOS-C2）。
- 不持久化 briefing 为长期知识。

## 3. 契约 / 涉及文件

```
src/domain/radar/briefingItem.ts            # 新增：BriefingItem、BriefingFeedback
src/radar/selectDailyBriefing.ts            # 新增：top3 选择 + tie-break
src/stores/briefingStore.ts                 # 新增：todayItems、feedbackByItemId
src/conversation/ConversationConductor.ts   # 扩展：radar briefing + signal 展示 hook
src/components/briefing/BriefingSignalChip.tsx  # 新增：「为什么和我有关」
src/lib/runLaunchSequence.ts                # 扩展：失败降级路径
src/showcase/showcaseCompanionScript.ts     # 扩展：radar 模式仍走 A1 脚本
```

### 3.1 BriefingFeedback

| 字段 | 值 |
|---|---|
| `kind` | `'not_interested' \| 'too_shallow' \| 'too_deep' \| 'already_know'` |
| `worldItemId` | string |
| `at` | ISO8601 |

**可测效果（mock）：** 对 `not_interested` / `already_know` 的 item，下次 `rankWorldItems` 分数 ×0；`too_shallow` 提高 elaboration 默认 depth（conductor，不测 LLM）。

### 3.2 Showcase / Radar 双模式

| 模式 | briefing 来源 | 断言 |
|---|---|---|
| `?showcase=1` | A1 映射 3 条 | 与 A2 脚本完全一致 |
| `?radar=1` | B2 top3 | id = `RADAR_RANKING_GOLDEN.top3Ids` |

### 3.3 Launch 失败降级

```
runLaunchSequence:
  try live WorldSource → WorldItemStore
  on failure → fixtureWorldSource only
  always → selectDailyBriefing → newsQueue 投影（≥1 条否则空态文案）
```

## 4. 数据结构 / store

| Store | 字段 |
|---|---|
| `briefingStore.todayItems` | `BriefingItem[3]` |
| `briefingStore.feedbackByItemId` | Map |
| `appStore.newsQueue` | BriefingItem → NewsItem 投影（兼容 V2） |

## 5. 验收清单

- [ ] Radar 模式：3 条 briefing = golden top3；每条 UI 可见 ≥1 explanation。
- [ ] Showcase 模式：A1/A2 全流程仍绿（无回归）。
- [ ] 反馈 `not_interested` 后，harness 第二次 ranking 将该 id 排除出 top3。
- [ ] Live source mock 失败：仍进入 companion，fixture 3 条。
- [ ] **不变量**：briefing 不 create 节点；ingest 仍仅用户口令。
- [ ] Brain MCP 只读；briefing 路径无写工具。

## 6. 涉及不变量

- **每日 3 条**，防信息过载（愿景 Milestone B）。
- **入库 = 用户确认**；briefing 仅 Suggest 层。
- **WorldItem ≠ KnowledgeNode**。
- **可解释推荐**（B2 signals 必须展示）。
- **mock-first**；无 API key 可 demo。

## 7. 测试（harness）

- `selectDailyBriefing.test.ts`：max=3、tie-break 确定性。
- `briefingStore.test.ts`：feedback 影响 mock 权重。
- `dailyBriefing.integration.test.ts`：radar launch → 3 条 + signal UI。
- `showcaseCoreLoop` 回归：showcase 不受 radar 代码破坏。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| newsQueue 与 BriefingItem 双轨 | 单一投影函数 `toNewsItem` |
| 反馈不影响排序（假功能） | 单测必须断言第二次 top3 变化 |
| Signal UI 遮挡星图 | 底部 chip，可关闭 |

## 9. DoD

- `pnpm check` 全绿；radar briefing + showcase 回归绿。
- C1 可挂接 briefing 交互事件（skip/elaborate/ingest）。

---

## Harness（验收协议）

### Scope

- **做：** top3 选择、signal 展示、feedback 会话效果、source 失败降级、A2 兼容。
- **不做：** LearningTrace、profile 编辑、Interview mode。

### Input fixtures

- B2 `RADAR_RANKING_GOLDEN`
- A1 `SHOWCASE_*`（showcase 模式）
- Mock failing live source + fixture fallback

### User actions

1. `?radar=1` 启动 → 进入 briefing。
2. 查看 3 条 explanation。
3. 对 top1 标记 `not_interested`；harness 触发 rerank。
4. （Showcase）跑 A1 voice script 全流程。

### Expected observations

| 模式 | 观测 |
|---|---|
| radar | 3 titles + signal chips；rerank 后 top1 变化 |
| showcase | 与 A2 expected observations 一致 |
| source fail | warn 日志；fixture 3 条仍出现 |

### Assertions

```text
Given radar mode + B2 golden
When launch completes
Then briefingStore.todayItems.length === 3
And each item.signals.length >= 1
When feedback not_interested on todayItems[0].id and rerank
Then todayItems[0].id !== previous top1
And no KnowledgeNode created without ingest
```

### Forbidden behaviors

- Briefing 静默 create。
- Top3 >3 或 <1（radar 正常路径）。
- Live HTTP 失败导致 phase=error 且无 fixture。
- 反馈写入 graph/profile 永久层（C2 前仅会话/mock 权重）。

### Failure recovery

| 失败 | 行为 |
|---|---|
| ranking 空 | 空态「今日暂无推荐」；conductor 进闲聊 |
| UI chip 失败 | 降级 transcript 内嵌 explanation |
| 投影 newsQueue 失败 | 阻塞 error 页 + 明确 hint |

### Verification commands

```bash
pnpm test -- selectDailyBriefing briefingStore dailyBriefing
pnpm test -- showcaseCoreLoop
pnpm check
```

### Out-of-scope

- LearningTrace（C1）。
- Profile 修正面板（C2）。
- Weekly Brain Review（D3）。
- 第四条 briefing / 无限滚动。
