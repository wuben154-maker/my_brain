# KOS-D3 — Weekly Brain Review 每周脑图回顾（`weekly-brain-review`）

- **阶段：** KOS-D · **状态：** ✅ 已实现
- **上游：** KOS-D1、KOS-D2、KOS-A3、KOS-C1 · **下游：** KOS-E1、KOS-E2、KOS-E3
- **复用：** `graphHistoryStore`、C1 `learningTraceStore`、D1 `sourceRefs`
- **依赖 / 前置里程碑：** **KOS-D2**（完整 GraphChange）；**KOS-A3** history；**KOS-C1** 可选 trace 摘要
- **可并行性：** 文案模板可与 E1 并行；**生成依赖 history 非空 fixture**

> **定位：** 基于 **真实 graph history**（非 LLM 幻觉）生成 **Weekly Brain Review** 报告：新增/合并/归档、热点概念、薄弱点、下一步建议。**只读 + Suggest**；不自动改图谱或发外部内容。

## 1. 目标

1. 定义 **`WeeklyBrainReview`**：`weekId`、`sections[]`、`citations[]`（nodeId / historyEntryId / traceId）。
2. 实现 **`buildWeeklyBrainReview({ graph, history, traces, profile, weekRange })`** → mock 确定性 markdown + structured sections。
3. UI 浮层 **`WeeklyReviewOverlay`**：从设置或语音「这周大脑发生了什么」触发。
4. 提供 **`WEEKLY_REVIEW_GOLDEN`**：固定 week fixture 下 sections 标题与 citation ids。
5. 禁止空 history 编造变更（须显式「本周无结构变更」section）。

## 2. 非目标

- 不定义 CognitiveAction 通用 schema（E1）。
- 不生成 GitHub issue / 博客（E2/E3）。
- 不自动 archive/merge（仅报告）。
- 不依赖 live LLM 通过 CI。
- 不做邮件推送或定时 job（手动触发 + harness）。

## 3. 契约 / 涉及文件

```
src/domain/review/weeklyBrainReview.ts     # 新增：类型
src/cognitive/buildWeeklyBrainReview.ts    # 新增：纯函数聚合
src/cognitive/weeklyReviewGolden.ts        # 新增：WEEKLY_REVIEW_GOLDEN
src/components/review/WeeklyReviewOverlay.tsx
src/stores/graphHistoryStore.ts            # 只读
src/learning/learningTraceStore.ts         # 只读
```

### 3.1 Section 类型（首版）

| sectionKind | 数据来源 | 示例标题 |
|---|---|---|
| `graph_changes` | graphHistoryStore | `本周图谱结构变更` |
| `new_concepts` | history create / ingest | `新增概念` |
| `merged_archived` | D2 entries | `合并与归档` |
| `learning_activity` | C1 traces | `学习与追问` |
| `weak_spots` | profile unfamiliar + trace | `薄弱点` |
| `next_steps` | 规则建议 | `下一步建议` |

### 3.2 WEEKLY_REVIEW_GOLDEN

**Fixture week：** `2026-W22`；history 含 A3 link + D2 merge/archive 各 1；ingest graphiti。

**断言：**

- `sections` 含 `graph_changes`、`new_concepts`、`next_steps`。
- `citations` 至少引用 1 个真实 `historyEntryId` 与 1 个 `nodeId`（`showcase-ingest-graphiti`）。
- `summary` 不得包含 history 中不存在的 merge 目标名。

## 4. 数据结构 / store

| 输出 | 说明 |
|---|---|
| `WeeklyBrainReview.markdown` | 中文可读；README 可摘录 |
| `WeeklyBrainReview.citations[]` | `{ type, id, label }` |

## 5. 验收清单

- [ ] 空 history week → `graph_changes` 文案为「无结构变更」；无虚构节点名。
- [ ] Golden week → snapshot === `WEEKLY_REVIEW_GOLDEN`（structured 部分）。
- [ ] 每条 merge/archive 引用对应 history entry id。
- [ ] UI 浮层可关闭；不阻塞 companion。
- [ ] 无 graph write；无外部 API。
- [ ] MCP 只读。

## 6. 涉及不变量

- **Provenance 引用真实 GraphChange**（愿景 Milestone D/E）。
- **行动建议 ≠ 自动行动**；next_steps 为 Suggest 文案。
- **Archive 非 delete**；报告用「归档」措辞。
- **mock-first**。

## 7. 测试（harness）

- `buildWeeklyBrainReview.test.ts`：golden + empty history。
- `weeklyReviewCitations.test.ts`：citation id 合法性。
- `weeklyReviewOverlay.test.tsx`：渲染 sections。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 报告像 LLM 胡编 | 规则模板 + citation 必填 |
| 与 E 系列重复 | D3 仅回顾；E 产 CognitiveAction 草稿 |

## 9. DoD

- `pnpm check` 全绿；weekly golden 绿。
- E1 可包装 review 为 CognitiveAction 子类型。

---

## Harness（验收协议）

### Scope

- **做：** weekly 聚合、sections、citations、overlay、golden。
- **不做：** issue/blog 草稿、自动 curation、export。

### Input fixtures

- `WEEKLY_REVIEW_FIXTURE_HISTORY`（A3+D2 条目 + 时间戳落在 W22）
- C1 traces（可选 2 条）
- `WEEKLY_REVIEW_GOLDEN`

### User actions

1. 固定 clock 到 `2026-W22` 周日。
2. 触发「Weekly Brain Review」。
3. 查看浮层 markdown / sections。

### Expected observations

- Sections 列表与 golden 一致。
- 点击 citation chip 高亮对应节点（可选 UI）。

### Assertions

```text
Given WEEKLY_REVIEW_FIXTURE_HISTORY
When buildWeeklyBrainReview(week 2026-W22)
Then structured snapshot === WEEKLY_REVIEW_GOLDEN
And ∀ citation historyEntryId: graphHistoryStore.has(id)
And graph node count unchanged after review
When history empty
Then no fabricated merge/archive names in output
```

### Forbidden behaviors

- 引用不存在的 historyEntryId / nodeId。
- Review 触发 auto merge/archive。
- 自动发布到 GitHub/博客。
- MCP 写 review 到 graph。

### Failure recovery

| 失败 | 行为 |
|---|---|
| history load 失败 | section 显示「变更记录不可用」 |
| overlay 失败 | 降级 console/markdown 下载占位 |

### Verification commands

```bash
pnpm test -- buildWeeklyBrainReview weeklyReviewCitations weeklyReviewOverlay
pnpm check
```

### Out-of-scope

- CognitiveAction schema（E1）。
- Project issue 生成（E2）。
- 定时每周自动弹出（A5 scheduler 复用顺延）。
- Live LLM 润色为 CI 必过。
