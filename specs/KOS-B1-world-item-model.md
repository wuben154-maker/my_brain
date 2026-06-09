# KOS-B1 — WorldItem 外部信息模型（`world-item-model`）

- **阶段：** KOS-B · **状态：** ✅ 已实现
- **上游：** KOS-A1、KOS-A2 · **下游：** KOS-B2、KOS-B3
- **复用：** `NewsItem`、`appStore.newsQueue`、`runLaunchSequence`、现有 NewsSource 接口
- **依赖 / 前置里程碑：** **KOS-A1/A2**（showcase briefing 与 `newsQueue` 已可 mock 演示）
- **可并行性：** 与 KOS-B2 设计可并行起草；**实现顺序：B1 → B2 → B3**

> **定位：** 把会话级 `NewsItem` / `newsQueue` 升级为可测试的 **`WorldItem`** 域模型：外部世界信息单位、短期存在、可去重、可过期。**不等于** `KnowledgeNode`；雷达抓取结果先落 `WorldItem`，再经 B2/B3 选入 briefing。

## 1. 目标

1. 定义 **`WorldItem`** 类型与 **`WorldItemStore`**（内存 + 可选 SQLite 会话表，不写入图谱）。
2. 定义 **`WorldSource`** 适配层：fixture source 稳定返回 ≥20 条；live source 失败可降级。
3. 实现 **去重**（`canonicalUrl` / `contentHash`）与 **过期策略**（TTL，默认 72h 会话级）。
4. 提供 **`RADAR_FIXTURE_WORLD_ITEMS`**（20 条，含五类：明显相关、弱相关、无关、重复、过时）。
5. Showcase 模式仍兼容 A1 的 3 条 brief（作为 `WorldItem` 子集或映射，不破坏 A 断言）。

## 2. 非目标

- 不做个性化相关度排序（KOS-B2）。
- 不做 `RadarSignal` 生成（KOS-B2）。
- 不做 daily top-3 选择与用户反馈（KOS-B3）。
- 不创建 `KnowledgeNode`；`WorldItem` 不得触发 `applyGraphMutation(create)`。
- 不持久化原始全文/音频；仅存 title、summary、metadata、sourceUrl。
- 不替换 KOS-A1 fixture ID（`showcase-brief-*` 保持可映射）。

## 3. 契约 / 涉及文件

```
src/domain/radar/worldItem.ts              # 新增：WorldItem、WorldItemKind、DedupeKey
src/domain/radar/worldItemStore.ts         # 新增：upsert、expire、listActive、dedupe
src/radar/worldSources/fixtureWorldSource.ts  # 新增：RADAR_FIXTURE_WORLD_ITEMS
src/radar/worldSources/worldSourceAdapter.ts  # 新增：NewsSource → WorldItem 映射
src/radar/runWorldIngest.ts                # 新增：launch 抓取 → WorldItemStore
src/showcase/showcaseFixtures.ts           # 扩展：SHOWCASE_WORLD_ITEMS（3 条，映射 A1 brief）
src/lib/runLaunchSequence.ts               # 扩展：radar 模式填充 WorldItemStore；showcase 短路 live
```

### 3.1 WorldItem 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 稳定 id；fixture 前缀 `radar-wi-*` |
| `kind` | `'ai_news' \| 'github_trending' \| 'release' \| 'blog' \| 'rss'` | 来源类型 |
| `title` | `string` | 展示标题 |
| `summary` | `string` | 讲解用摘要（非全文） |
| `sourceUrl` | `string \| null` |  canonical 链接 |
| `contentHash` | `string` | SHA-256(title+summary+sourceUrl) 去重用 |
| `fetchedAt` | `ISO8601` | 抓取时间；fixture 冻结 `2026-06-01T08:00:00.000Z` |
| `expiresAt` | `ISO8601` | `fetchedAt + TTL` |
| `status` | `'active' \| 'expired' \| 'superseded'` | 生命周期 |
| `duplicateOf` | `string \| null` | 去重指向 canonical id |

### 3.2 RADAR_FIXTURE_WORLD_ITEMS（20 条分类）

| 类别 | 数量 | 示例 id 前缀 | harness 用途 |
|---|---|---|---|
| 明显相关 | 5 | `radar-wi-rel-*` | 应对齐用户 graph（demo-agent、demo-mcp 等） |
| 弱相关 | 4 | `radar-wi-weak-*` | 排序边界 |
| 无关 | 4 | `radar-wi-noise-*` | 不得进 top 3（B2 golden） |
| 重复 | 3 | `radar-wi-dup-*` | 同 `contentHash` 或同 url，保留 1 条 active |
| 过时 | 4 | `radar-wi-stale-*` | `expiresAt` 已过去，listActive 排除 |

**Showcase 映射：** `showcase-brief-1/2/3` ↔ `radar-wi-showcase-1/2/3`（与 A1 `SHOWCASE_BRIEFING_ITEMS` 字段一致）。

### 3.3 去重与过期

```
upsertWorldItem(item):
  if duplicate canonicalUrl or contentHash exists → mark duplicateOf, status=superseded
  else → status=active

expireWorldItems(now):
  expiresAt < now → status=expired（不 DELETE 行，仅过滤）
```

## 4. 数据结构 / store

| Store | 行为 |
|---|---|
| `worldItemStore.items` | 内存 Map；radar 模式 launch 后填充 |
| `appStore.newsQueue` | **兼容层**：B3 前可由 `WorldItem` → `NewsItem` 投影供 conductor |
| `graphStore` | **只读**消费（B2）；本 spec 不写 |

## 5. 验收清单

- [ ] `WorldItem` 类型与 Zod/纯函数校验导出。
- [ ] `fixtureWorldSource.fetch()` 返回 20 条，JSON 快照稳定。
- [ ] 去重：3 条 dup 夹具 upsert 后 active 数 +2（非 +3）。
- [ ] 过期：4 条 stale 在 `listActive()` 中不可见。
- [ ] Showcase：`SHOWCASE_WORLD_ITEMS` 3 条与 A1 brief 一一映射。
- [ ] Launch radar 模式：**无 API key**；live source mock 失败不阻塞 fixture 填充。
- [ ] **不变量**：无任何 `WorldItem` 路径调用 `applyGraphMutation(create)`。
- [ ] 记忆引擎 / MCP 不写 `WorldItemStore` 以外永久层（本 store 会话级可丢）。

## 6. 涉及不变量

- **世界信息 ≠ 永久知识**；`WorldItem` 短期、可丢弃。
- **新建节点 = 用户确认**（仍仅 ingest 出口）。
- **本地优先**；fixture source 为 demo 底盘。
- **Provider 可换**；WorldSource 适配 NewsSource 接口。
- **记忆引擎不写图谱/画像**。

## 7. 测试（harness）

- `worldItem.test.ts`：序列化、hash、TTL。
- `worldItemStore.test.ts`：dedupe、expire、listActive。
- `fixtureWorldSource.test.ts`：20 条分类计数断言。
- `showcaseWorldItemMapping.test.ts`：A1 brief id 映射不漂移。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 与 A1 `NewsItem` 双轨漂移 | showcase 显式映射表；B3 统一 briefing 入口 |
| SQLite 过早引入 | 首版内存 store + 单测；持久化顺延 |
| 20 条 fixture 维护成本 | 分类标签 + golden 文档表 |

## 9. DoD

- `pnpm check` 全绿；world item 单测绿。
- B2 可 import `RADAR_FIXTURE_WORLD_ITEMS` + `SHOWCASE_GRAPH_SNAPSHOT` 跑排序 eval。
- Harness § 全部可映射测试名。

---

## Harness（验收协议）

### Scope

- **做：** `WorldItem` schema、fixture 20 条、去重/过期、launch ingest 到 store、A1 映射。
- **不做：** RadarSignal、top-3、用户反馈、ingest create。

### Input fixtures

- `RADAR_FIXTURE_WORLD_ITEMS`（20 条，§3.2）
- `SHOWCASE_WORLD_ITEMS`（3 条，映射 A1）
- `SHOWCASE_NOW = 2026-06-01T12:00:00.000Z`

### User actions

1. 启用 `?radar=1` 或 harness 直接 `runWorldIngest({ source: 'fixture' })`。
2. （可选）重复 launch 触发 dedupe。
3. 将 clock 设为过期后调用 `expireWorldItems`。

### Expected observations

- `worldItemStore` active 数 = 20 - 4 stale - 2 dup 合并 = **14**（精确数以 golden 文件为准）。
- Showcase 3 条 id 可投影为 A1 briefing。
- `graphStore` 节点数不变。

### Assertions

```text
Given RADAR_FIXTURE_WORLD_ITEMS
When upsert 全部 + expire at SHOWCASE_NOW
Then listActive().length === RADAR_ACTIVE_GOLDEN_COUNT
And duplicateOf 非空项数 === 2
And 无 applyGraphMutation 调用
And showcase-brief-1/2/3 投影字段 === SHOWCASE_BRIEFING_ITEMS
```

### Forbidden behaviors

- `WorldItem` → 直接 create `KnowledgeNode`。
- Fixture 依赖实时 HTTP 才能通过单测。
- Hard-delete 过期项（须 status=expired）。
- 记忆引擎写入 WorldItem 或图谱。

### Failure recovery

| 失败 | 行为 |
|---|---|
| live WorldSource 失败 | 记录 warn；fixture 仍填充；UI mock 角标 |
| dedupe 冲突 | 保留先入库 id；后项 superseded |
| store 空 | briefing 降级「暂无外部资讯」；不 crash |

### Verification commands

```bash
pnpm test -- worldItem worldItemStore fixtureWorldSource showcaseWorldItemMapping
pnpm check
```

### Out-of-scope

- `RadarSignal` 与排序（KOS-B2）。
- Daily briefing UI（KOS-B3）。
- 用户「不感兴趣」反馈。
- 全文抓取与持久化。
