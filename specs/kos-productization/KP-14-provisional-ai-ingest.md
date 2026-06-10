# KP-14 — Provisional AI Ingest（`provisional-ingest`）

- **阶段：** KP Phase 7 · **状态：** planned
- **上游：** KP-13（Phase 6 完成） · **下游：** KP-15
- **依赖 / 前置里程碑：** **KP-09 PASS** 且 Phase 6 全类型 PASS
- **可并行性：** 无；高风险写入面

## 定位

允许 AI 自动创建 **候选知识**，但先进入隔离区（`ProvisionalNode` 或等价），**不直接污染永久图谱**。晋升永久节点的**唯一出口**是用户确认；重复高置信信号/严格规则仅影响候选排序、高亮和推荐强度，**不得**自动创建永久节点。候选可解释、可撤销、可过期。

## 目标

1. 隔离区模型：`sourceRefs`、`reason`、`confidence`、`expiresAt`、`suggestedRelations`。
2. AI 自动生成候选 → **默认不**进入长期 `KnowledgeGraph`。
3. 晋升机制：**仅**用户确认 → 永久节点 + graph history + undo。重复高置信信号、严格规则 → 仅影响 provisional 区排序/高亮/推荐强度，**禁止**自动晋升为永久节点。
4. 低置信或过期候选自动清理。
5. UI **明确区分**候选 vs 长期知识（星图不可混淆）。
6. 永久 export **不含**未晋升候选。

## 非目标

- 不让 AI 候选 bypass 隔离直写 permanent graph（硬禁止）。
- 不做 external action execute（KP-15）。
- 不替代用户语音确认入库主路径（V3）。
- 不做 cloud 同步。

## 涉及文件/模块

```
src/domain/provisional/provisionalNode.ts
src/stores/provisionalStore.ts
src/storage/provisionalRepository.ts
src/agent/provisionalCandidateGenerator.ts   # 或 curation 子模块
src/components/provisional/ProvisionalInbox.tsx  # companion shell 内
src/lib/promoteProvisionalToGraph.ts
src/domain/provisional/provisionalNoPermanentWrite.test.ts  # 新建：boundary（与 provisionalNode.ts 同目录）
src/domain/provisional/promoteProvisional.test.ts           # 新建
src/domain/provisional/provisionalExpiry.test.ts            # 新建
```

## 用户可见流程或数据流

```
AI 生成候选 → provisional 区（非星图永久节点样式）
  → 用户查看 reason + sourceRefs
  → 确认晋升 → 走 ingest gate → graph history → 星图点亮
  → 或拒绝/批量丢弃/等待过期
  → export 永久图谱不含 provisional
```

## 验收清单

- [ ] Boundary test：AI candidate path **不调用** permanent graph create。
- [ ] 晋升 test：**仅**用户确认才创建长期节点；规则/置信度自动晋升测试必须 FAIL。
- [ ] Expiry/cleanup test：过期候选清除。
- [ ] UI 区分 provisional vs permanent（不同样式/区域）。
- [ ] 晋升后进 history，可 undo。
- [ ] 永久 export 不含 provisional。
- [ ] 用户可查看、确认、拒绝、撤销晋升。
- [ ] `spec-acceptance-review` PASS。
- [ ] **信任边界 UI**：design-review + qa 审候选/永久区分、晋升确认流。

## 不变量与权限边界

- **禁止** AI 自动候选直接写永久图谱。
- **禁止** 规则/置信度/重复信号自动晋升为永久节点（违反 AGENTS.md 不变量 #2）。
- 晋升后的 create **必须**经用户确认链（显式 confirm UI）。
- MCP 不可 promote provisional without user gate。
- MemoryProvider 不写图谱。

## 测试 / 验证命令

```bash
pnpm test -- provisionalNoPermanentWrite promoteProvisional provisionalExpiry provisionalUi
pnpm check
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 候选与永久 UI 混淆 | 分离 overlay + export filter |
| 静默晋升 / 规则自动晋升 | promotion test 断言仅 user confirm；规则路径 FAIL |
| 候选堆积 | expiry + batch discard |

**Stop condition：** 候选与永久在 **数据或 UI** 无法清晰区分 → **停止** Phase 7，不进入 KP-15。

## Skill 使用要求

- **必须（信任边界）：** `design-review` + `qa` 重点审候选/永久区分、晋升确认流。
- 规划期：`/plan-design-review` 若新建 provisional UI shell。

---

## Harness 验收协议

### Scope

- **做：** 隔离区、晋升、过期、UI 区分、export 边界。
- **不做：** external action、跳过用户 confirm 的 bulk promote。

### Input fixtures

- AI fixture 生成 3 provisional candidates
- One high-confidence candidate（高置信仅影响排序/高亮，不自动晋升）

### User actions

1. 触发 AI 候选生成 → 见 provisional UI，星图无永久新节点。
2. 晋升 1 条 → 星图出现 + history。
3. undo 晋升。
4. 等 expiry → 候选消失。
5. export → 无 un promoted ids。

### Expected observations

| 观测 | 期望 |
|------|------|
| 生成后 | provisional store 有；permanent graph 无 |
| 晋升后 | permanent 有；history 有 |
| export | 无 provisional |

### Assertions

```text
Given AI generates candidates
When before user promotion
Then permanent graph create not called
And export excludes provisional
When user promotes with explicit confirm
Then permanent node + history + undo works
When high-confidence or strict-rule only (no user confirm)
Then permanent graph create NOT called (ranking/highlight may change only)
When expired
Then candidate removed from provisional store
```

### Forbidden behaviors

- AI path calls applyGraphMutation for permanent create directly。
- 规则/置信度/重复信号自动晋升为永久节点。
- Provisional nodes appear identical to Concept in star map。
- Export includes provisional without flag。

### Failure recovery

| 失败 | 行为 |
|------|------|
| promotion 半失败 | KP-07 风格 recovery；不 leave duplicate |
| UI 混淆 | 阻塞 release |

### Verification command

```bash
pnpm test -- provisionalNoPermanentWrite promoteProvisional provisionalExpiry provisionalUi
pnpm check
```

---

## 未来提案（不在本 spec 范围）

若未来需要「重复高置信 / 严格规则自动晋升」能力，须**先**修订 `AGENTS.md` 不变量 #2 与蓝图四级信任模型，更新不变量测试，并单独走产品决策 spec；**不属于** KP-14 交付范围。
