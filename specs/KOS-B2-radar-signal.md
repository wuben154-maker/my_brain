# KOS-B2 — RadarSignal 相关度与解释（`radar-signal`）

- **阶段：** KOS-B · **状态：** ✅ 已实现
- **上游：** KOS-B1、KOS-A1 · **下游：** KOS-B3
- **复用：** `graphContextPack.ts`、`DEFAULT_USER_PROFILE`、`autoCurate` 的 graph 读取模式
- **依赖 / 前置里程碑：** **KOS-B1**（`WorldItem` + 20 条 fixture）；**KOS-A1**（`SHOWCASE_GRAPH_SNAPSHOT`、profile）
- **可并行性：** 依赖 B1 fixture；与 B3 UI 设计可并行

> **定位：** 对每条 `WorldItem` 计算 **`RadarSignal`**（为什么与你有关），并产出 **确定性排序** 与 **golden ranking eval**。每条入选 briefing 的项必须至少 1 条可解释 signal。

## 1. 目标

1. 定义 **`RadarSignal`**：`reasonCode`、中文 `explanation`、关联 graph 节点 id、置信度分。
2. 实现 **`scoreWorldItems(graph, profile, items)`** → 排序分 + signals[]。
3. 实现 **`rankWorldItems`**：固定 graph/profile 下 top 3 **golden 集合**可断言。
4. 提供 **`RADAR_RANKING_GOLDEN`**：top 3 id 列表 + 禁止项（noise 类不得入选）。
5. Mock-first：`MockRelevanceScorer` 规则链，不依赖 live LLM。

## 2. 非目标

- 不选 daily briefing 最终 3 条 UI/会话状态（KOS-B3）。
- 不处理用户反馈「不感兴趣/已知道」（KOS-B3）。
- 不写图谱、不写 profile（只读消费）。
- 不抓取 WorldItem（KOS-B1）。
- 不生成 ingest 候选（仍由 briefing + 用户口令触发）。

## 3. 契约 / 涉及文件

```
src/domain/radar/radarSignal.ts           # 新增：RadarSignal、RadarReasonCode
src/radar/scoreWorldItems.ts              # 新增：纯函数打分 + signal 生成
src/radar/mockRelevanceScorer.ts          # 新增：规则链 mock scorer
src/radar/radarRankingGolden.ts           # 新增：RADAR_RANKING_GOLDEN 常量
src/lib/graphContextPack.ts               # 复用：压缩 graph 供 scorer 上下文
src/showcase/showcaseFixtures.ts          # 只读：SHOWCASE_GRAPH_SNAPSHOT
```

### 3.1 RadarSignal 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `worldItemId` | `string` | 关联 WorldItem |
| `reasonCode` | enum | 见 §3.2 |
| `explanation` | `string` | 中文，≤120 字，必须引用 graph/兴趣/项目 |
| `linkedNodeIds` | `string[]` | 图谱节点；可为空但 noise 类不得有假链接 |
| `score` | `number` | 0–1；用于排序 |

### 3.2 RadarReasonCode（首版）

| code | 含义 | 示例 explanation |
|---|---|---|
| `graph_concept_overlap` | 与已有概念重合 | `与你图谱中的 AI Agent、MCP 相关。` |
| `project_adjacent` | 与 my_brain 项目方向相邻 | `涉及 VoiceProvider 抽象，与你的实时语音方案一致。` |
| `interest_match` | profile 兴趣命中 | `匹配你的 AI 基础设施兴趣。` |
| `trend_anomaly` | 趋势异常（fixture 规则） | `GitHub 星增速异常，值得一看。` |
| `weak_tangent` | 弱相关 | `与 LLM 间接相关，优先级较低。` |

### 3.3 RADAR_RANKING_GOLDEN

给定 `SHOWCASE_GRAPH_SNAPSHOT` + `DEFAULT_USER_PROFILE` + `RADAR_FIXTURE_WORLD_ITEMS`（active only）：

| 断言 | 值 |
|---|---|
| `top3Ids` | `['radar-wi-rel-realtime', 'radar-wi-rel-graphiti', 'radar-wi-rel-voice-agent']`（实现时锁定 JSON） |
| `forbiddenInTop3` | 全部 `radar-wi-noise-*`、`radar-wi-stale-*`、`radar-wi-dup-*` |
| 每条 top3 | `signals.length >= 1` 且 `explanation` 非空 |

**Showcase 3 条：** showcase world items 在完整 20 条池中应落入 top 5（保证 A2 演示仍合理）。

## 4. 数据结构 / store

| 模块 | 行为 |
|---|---|
| `scoreWorldItems` | 纯函数；输出 `{ ranked: WorldItemScored[], signalsByItemId }` |
| `worldItemStore` | 只读输入 |
| `graphStore` / profile | 只读 |

## 5. 验收清单

- [ ] `RadarSignal` 类型与 reasonCode 枚举导出。
- [ ] Mock scorer：相同输入 → 相同 top3（快照测试）。
- [ ] 每条 top3 至少 1 signal，`linkedNodeIds` 在 graph 中存在或为 []。
- [ ] noise 类 item 分数 < 弱相关阈值，永不进 top3。
- [ ] **无** LLM API key 依赖；`MockRelevanceScorer` 覆盖 CI。
- [ ] 不变量：scorer 不调用 `applyGraphMutation`、不写 profile store。

## 6. 涉及不变量

- **相关度可解释**（愿景）；禁止「AI 认为重要」空文案。
- **WorldItem ≠ KnowledgeNode**。
- **只读** graph/profile；记忆引擎不参与打分写回。
- **Provider 可换**：live scorer 实现 `RelevanceScorer` 接口，mock 为默认。

## 7. 测试（harness）

- `scoreWorldItems.test.ts`：golden top3 深度相等。
- `radarSignal.test.ts`：explanation 模板、linkedNodeIds 合法性。
- `mockRelevanceScorer.test.ts`：五类 fixture 分桶断言。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| Live LLM 非确定性 | CI 仅跑 mock；live 为可选 eval |
| Golden 与 fixture 漂移 | golden 与 B1 同 PR 维护 |
| 过度拟合 demo graph | 注释 linkedNodeIds 须真实存在于 snapshot |

## 9. DoD

- `pnpm check` 全绿；ranking golden 测试绿。
- B3 可消费 `rankWorldItems` 输出填充 briefing。

---

## Harness（验收协议）

### Scope

- **做：** RadarSignal schema、mock 打分、top3 golden、explainability 断言。
- **不做：** briefing 会话、用户反馈、ingest、UI 浮层。

### Input fixtures

- KOS-B1 `RADAR_FIXTURE_WORLD_ITEMS`（active 子集）
- KOS-A1 `SHOWCASE_GRAPH_SNAPSHOT`、`DEFAULT_USER_PROFILE`
- `RADAR_RANKING_GOLDEN`

### User actions

- Harness 调用 `rankWorldItems({ graph, profile, items })`（无 UI）。

### Expected observations

- 返回 `ranked[0..2]` id 等于 golden top3（顺序一致）。
- `signalsByItemId[top3[i]]` 每条 ≥1 signal。

### Assertions

```text
Given SHOWCASE_GRAPH + profile + active WorldItems
When rankWorldItems()
Then top3Ids === RADAR_RANKING_GOLDEN.top3Ids
And ∀ id ∈ top3: signals[id].length >= 1
And ∀ id ∈ forbiddenInTop3: id ∉ top3
And applyGraphMutation 调用次数 === 0
```

### Forbidden behaviors

- Top3 含 noise/stale/dup 类 id。
- Signal explanation 为空或不含 graph/兴趣/项目任一锚点（mock 规则可检）。
- 写 profile 或 graph。
- 单测调用外网 LLM。

### Failure recovery

| 失败 | 行为 |
|---|---|
| graph 空 | 降级 interest-only 打分；测试夹具禁止此路径 |
| scorer 抛错 | 返回原序前 3 条 active + warn signal |

### Verification commands

```bash
pnpm test -- scoreWorldItems radarSignal mockRelevanceScorer
pnpm check
```

### Out-of-scope

- Briefing 选择与反馈（B3）。
- Ingest 候选构建。
- Weekly review / Interview mode。
