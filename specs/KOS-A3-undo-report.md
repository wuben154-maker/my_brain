# KOS-A3 — 整理报告、变更历史与撤销（`undo-report`）

- **阶段：** KOS-A · **状态：** ✅ 已实现
- **上游：** KOS-A1、KOS-A2 · **下游：** KOS-A4
- **复用：** V4 `graphHistoryStore`、`curationReport.ts`、`GraphUndoControl`、`domain/graphHistory`
- **依赖 / 前置里程碑：** **KOS-A2**（核心循环产生 history entry）；**KOS-A1**（golden reason 文案）
- **可并行性：** UI 与语音汇报可并行开发；**依赖 A2 ingest+curate 路径先通**

> **定位：** 让用户**看见**自动整理做了什么、**为什么**这样做、并能**一键撤销**。兑现愿景「整理可以自动，但必须可解释、可撤销」与 V4 兜底三件套中的 **history + undo + 口头汇报**。

## 1. 目标

在 showcase 与常规定义路径上，补齐 **可解释整理 + 可撤销** 的用户可见层：

1. **Curation reason report**：展示 `reasonCode`、`reasonDetail`、`summary`、受影响节点。
2. **Graph history**：时间序列表 / 面板，可查看 before/after 摘要。
3. **Undo**：对最近一次（或指定）auto-curate entry 一键恢复 `before` 快照。
4. **Spoken report**：节流口播整理摘要（复用 `curationReport.ts`）。
5. **Harness 断言**：undo 后仅反转该条 auto-curate mutation；archive 仍非 hard-delete。

## 2. 非目标

- 不新增 merge/archive 算法（沿用 V4 `autoCurate`）。
- 不做 Weekly Brain Review（KOS-D3）。
- 不改 graph history 存储格式（仍为全量 before/after 快照）。
- 不实现多步 redo 栈（仅 undo + `undone` 标记）。
- 不让用户审批整理（v2 已自动 apply）；本 spec 只做 **事后解释与撤销**。
- 不实现 GitHub 文档（KOS-A4）。

## 3. 契约 / 涉及文件

```
src/components/curation/CurationReportOverlay.tsx   # 新增：整理报告浮层
src/components/shell/GraphHistoryPanel.tsx          # 新增或扩展 GraphUndoControl
src/components/shell/GraphUndoControl.tsx           # 扩展：showcase 模式可见性
src/conversation/curationReport.ts                  # 复用：shouldSpeakCurationReport / formatCurationReport
src/stores/graphHistoryStore.ts                     # 复用：record / undo / load
src/domain/graphHistory.ts                          # 复用：CurationReasonCode
src/showcase/showcaseFixtures.ts                    # 引用：SHOWCASE_AUTO_CURATE_GOLDEN 文案
```

### 3.1 CurationReportOverlay

**触发：** `runAutoCurateAfterIngest` 完成后，`graphHistoryStore` 新增 entry → 浮层自动展开（showcase 模式强制展开；常规定义可 5s 自动收起）。

**展示字段（中文 UI）：**

| 字段 | 来源 | 示例（showcase golden） |
|---|---|---|
| 操作类型 | `entry.kind` | `连边` |
| 摘要 | `entry.summary` | `已把 Graphiti 连到 AI Agent` |
| 原因码 | `entry.reasonCode` | `ingest_link` |
| 原因说明 | `entry.reasonDetail` | `新概念 Graphiti 与已有 AI Agent 编排能力相关，自动连边。` |
| 受影响节点 | `entry.affectedNodeIds` | `showcase-ingest-graphiti`, `demo-agent` |

**交互：** 「撤销这次整理」→ 调用 `graphHistoryStore.undo(entry.id)`；关闭浮层。

### 3.2 Graph History 面板

- 列表按 `at` 降序；每项显示 `summary`、`kind`、`undone` 状态。
- 点击项展开 **精简 diff**：新增/删除的 node ids、edge ids（纯函数 `summarizeGraphDiff(before, after)`）。
- Showcase：至少展示 1 条 auto-curate entry；undo 后该项标记 `undone: true`。

### 3.3 Undo 语义

沿用 V4：

```
undo(mutationId):
  1. 查找 entry；若 undone 则 no-op
  2. 基于 entry.before/entry.after 计算该条 mutation 新增的边/状态变化
  3. 删除该条 auto-curate 新增的边，恢复 entry.before 中已有节点/边的状态
  4. 不 hard-delete 当前图中 entry 之后新增的概念节点或无关边
  5. syncDisplayGraph(storage) 后刷新 graphStore
```

**边迁移恢复：** 若 entry 含 merge（非常规定义），undo 必须恢复 merge 前边集合；showcase golden 仅 link，测 link 移除即可。

**ingest create 撤销：** 本 spec **不**要求撤销用户确认的 create（仅 auto-curate）；若用户需「刚入库就删」，走手动 archive（out-of-scope 交互优化）。

### 3.4 Spoken report

- `shouldSpeakCurationReport(entry, lastSpokenAt)`：同会话 ≥120s 节流。
- `formatCurationReport(entry)` → `turn.say` 非阻塞。
- Showcase：固定口播 `已把 Graphiti 连到 AI Agent。`（与 summary 一致）。
- 语音口令「撤销」：**不**自动 undo（避免误触）；undo 以 UI 按钮 / 明确 harness 事件为准。

## 4. 数据结构 / store

| 字段 | 说明 |
|---|---|
| `GraphHistoryEntry.reasonCode` | `CurationReasonCode` 枚举 |
| `GraphHistoryEntry.reasonDetail` | 中文可读解释 |
| `GraphHistoryEntry.affectedNodeIds` | UI 高亮用 |
| `GraphHistoryEntry.undone` | undo 后 true |
| `graphHistoryStore.entries` | 内存 + SQLite `graph_history` |

## 5. 验收清单

- [ ] Auto-curate 后浮层展示 golden 的 reasonCode / reasonDetail / summary。
- [ ] Graph history 列表可见 ≥1 条 entry，含时间戳与 kind。
- [ ] 点击「撤销」：该条 entry 新增边消失；`entry.before` 中节点/边状态恢复；`undone === true`。
- [ ] Undo 后仅撤销 auto-curate 连边；用户确认入库的 `showcase-ingest-graphiti` 节点仍保留。
- [ ] Undo 不回滚该 entry 之后新增的用户确认概念节点或无关边。
- [ ] `demo-bert` 仍 archived 且可 `loadGraph`（archive 非 delete 回归）。
- [ ] 口播节流：连续 2 次 curate（测试夹具）仅 speak 1 次。
- [ ] Showcase 全流程：A2 闭环 → 见报告 → undo → 图状态恢复。
- [ ] **无**静默整理：每条 auto apply 必有 history entry + reason。
- [ ] MCP / 记忆引擎无写图谱路径。
- [ ] Brain MCP 保持只读；不得新增或暴露 `create/update/delete/merge/archive/undo` 等写工具。

## 6. 涉及不变量

- **整理可自动，但必须可解释、可撤销**（愿景 + V4）。
- **删除 = 归档**；undo 不触发 SQL DELETE。
- **新建仍仅用户确认**；undo 仅针对 post-ingest curation。
- **记忆引擎不写图谱**。
- **Brain MCP 默认只读**；外部 agent 不能触发 undo 或任何图谱写入。

## 7. 测试（harness）

- `curationReportOverlay.test.tsx`：渲染 reason 字段、undo 回调。
- `graphHistoryPanel.test.tsx`：列表、diff 摘要、undone 态。
- `graphHistoryStore.test.ts`：扩展 showcase golden entry undo 往返。
- `curationReport.test.ts`：节流（已有，补 showcase 文案）。
- `showcaseUndoReport.integration.test.ts`：A2 闭环 → undo → 图断言。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 全量快照 undo 成本高 | 接受；H5 事务化顺延 |
| 用户误以为 undo 会删 ingest | UI 文案区分「撤销整理」vs「删除概念」 |
| 浮层遮挡星图 | 半透明、可关闭；showcase 默认底部条 |
| reasonDetail 质量参差 | showcase 用 golden 固定；live 走 `curationReason` meta |

## 9. DoD

- `pnpm check` 全绿；undo 往返单测 + showcase integration 绿。
- 手动 demo：入库 → 见报告 → undo → 边消失可肉眼确认。
- KOS-A4 文档可引用本 spec 的 3 分钟步骤（含 undo 一步）。

---

## Harness（验收协议）

### Scope

- **做：** 整理报告 UI、history 列表、undo 恢复、口播节流。
- **不做：** 核心 briefing 循环（A2）、fixture 定义（A1）、GitHub 文档（A4）、Weekly Review。

### Input fixtures

- KOS-A1 `SHOWCASE_AUTO_CURATE_GOLDEN`。
- KOS-A2 完整闭环后的 `graphHistoryStore.entries[0]`。
- `entry.before` / `entry.after` 全量快照。

### User actions

1. 完成 A2 showcase ingest + auto-curate。
2. 观察 CurationReportOverlay 自动出现。
3. 打开 Graph History 面板查看 entry。
4. 点击「撤销这次整理」。
5. （可选）等待口播整理摘要。

### Expected observations

| 时机 | 观测 |
|---|---|
| curate 完成 | overlay 显示 `ingest_link` + 中文 reasonDetail |
| history 面板 | 1 条 `link` entry，`affectedNodeIds` 长度 2 |
| undo 点击 | 边 `showcase-ingest-graphiti→demo-agent` 消失 |
| undo 后 | 节点 `showcase-ingest-graphiti` **仍存在**（仅撤销整理，不撤销 ingest） |
| speak | mock voice 收到 formatCurationReport 文本 ≤1 次/120s |

> **注意：** 若产品决策为 undo 连 ingest 一并回滚，须在实现前修订本 spec 并同步 A2 断言。默认采用 V4「仅撤销结构变更」语义：**undo 只恢复 curation mutation，保留用户确认的节点**。

### Assertions

```text
Given A2 完成且 graphHistoryStore 有 link entry
When 用户点击 undo(entry.id)
Then graphStore.edges 不含 showcase-ingest-graphiti → demo-agent
And graphStore.nodes 仍含 showcase-ingest-graphiti
And graphStore 仍保留该 entry 之后新增的无关节点/边
And entry.undone === true
And undo 持久化不调用 deleteConcept
```

### Forbidden behaviors

- 无 history entry 的 auto `applyGraphMutation`（post-ingest）。
- Undo 执行 SQL DELETE 或硬删节点。
- 外部 agent 触发 undo 或写 history。
- Brain MCP 暴露 create/update/delete/merge/archive/undo 任一写工具。
- 整理报告展示空 reasonDetail（showcase 模式）。
- 口播整理报告阻塞 ingest 主路径 >500ms（mock 时钟）。

### Failure recovery

| 失败 | 行为 |
|---|---|
| history persist 失败 | 仍更新内存 store；UI 显示「变更未持久化，重启后无法撤销」 |
| undo 时 entry 缺失 | Toast「记录不存在」；图不变 |
| overlay 渲染失败 | 降级为角落 GraphUndoControl 单按钮 |
| speak 失败 | 仅 UI 报告，不阻断 undo |

### Verification commands

```bash
pnpm test -- curationReportOverlay graphHistoryPanel graphHistoryStore showcaseUndoReport
pnpm test -- curationReport
pnpm check
```

### Out-of-scope

- Redo / 分支历史。
- 撤销用户 ingest create（单步「入库即撤销」产品交互）。
- Merge/archive 多 mutation 合并报告（后续 D 系列）。
- 导出 graph history 到 Markdown。
- Live LLM 生成 reasonDetail（showcase 用固定 golden）。
