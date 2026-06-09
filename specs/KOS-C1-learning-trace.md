# KOS-C1 — LearningTrace 学习轨迹（`learning-trace`）

- **阶段：** KOS-C · **状态：** ✅ 已实现
- **上游：** KOS-B3、KOS-A2、KOS-A3 · **下游：** KOS-C2、KOS-C3、KOS-D3
- **复用：** `ConversationConductor`、`ingestStore`、`briefingStore`、V5 profile 蒸馏（只读边界）
- **依赖 / 前置里程碑：** **KOS-B3**（briefing 交互）；**KOS-A2/A3**（ingest/skip/elaborate 事件）
- **可并行性：** 与 C2 设计可并行；**实现依赖 B3 briefing 事件源**

> **定位：** 把用户对资讯/概念的 **追问、跳过、入库、复习** 记录为 **`LearningTrace`**（中长期），供讲解深度、复习提醒与 C3/D3 消费。**不写图谱、不写 profile**（记忆边界不变）。

## 1. 目标

1. 定义 **`LearningTrace`**：`conceptRef`（node id 或 pending title）、`eventKind`、`at`、`sessionId`、`metadata`。
2. 实现 **`recordLearningTrace(event)`** 纯函数 + SQLite 表 `learning_traces`（local-first）。
3. 挂钩 conductor 事件：`skip`、`elaborate`、`ingest`、`review_prompt`、`explain_node`。
4. 提供 **`LEARNING_TRACE_FIXTURES`**：A1/A2 showcase 脚本的三条确定性事件序列 golden，非入库事件使用 pending ref，入库事件使用最终 node id。
5. 暴露 **`listTracesForConcept(conceptId)`** 供 C2/C3 只读查询。

## 2. 非目标

- 不自动更新 profile 权重（C2 显式修正；蒸馏仍 V5 静默，本 spec 不扩展蒸馏写 profile 规则）。
- 不写 `KnowledgeNode` / `KnowledgeEdge`。
- 不做 Interview Mode（C3）。
- 不做复习 UI 推送调度（仅记录 `review_due` 信号，提醒 UI 顺延）。
- 不让记忆引擎（EverMemOS）写 trace 表（trace 由 app 层写，非 MemoryProvider）。

## 3. 契约 / 涉及文件

```
src/domain/learning/learningTrace.ts       # 新增：类型、LearningEventKind
src/learning/recordLearningTrace.ts        # 新增：校验 + persist
src/learning/learningTraceStore.ts         # 新增：query by concept/session
src/conversation/ConversationConductor.ts  # 扩展：事件 hook → record
src/conversation/ingestActions.ts          # 扩展：ingest 成功 → trace
src/storage/migrations/learning_traces.sql # 新增：表迁移
```

### 3.1 LearningEventKind

| kind | 触发 |
|---|---|
| `briefing_skip` | 用户「不要」 |
| `briefing_elaborate` | 「讲细点」 |
| `briefing_ingest` | 「入」成功 |
| `node_review` | 用户请求复习某节点 |
| `teaching_followup` | 追问 turn（mock 固定句触发） |

### 3.2 LEARNING_TRACE_FIXTURES golden

A1/A2 showcase 脚本 replay 后，按序产生：

| # | kind | metadata |
|---|---|---|
| 1 | `briefing_skip` | `{ conceptRef: 'pending:OpenAI Realtime API', worldItemId: 'showcase-brief-1' }` |
| 2 | `briefing_elaborate` | `{ conceptRef: 'pending:voice-agent-starter', worldItemId: 'showcase-brief-2', depth: 1 }` |
| 3 | `briefing_ingest` | `{ conceptRef: 'showcase-ingest-graphiti', worldItemId: 'showcase-brief-3', nodeId: 'showcase-ingest-graphiti' }` |

**断言：** `listTracesForConcept('showcase-ingest-graphiti')` 在 replay 后长度 = 1，且该条 `kind === 'briefing_ingest'`。pending refs 可通过 `listTracesForPendingRef(...)` 查询，不混入 node id 查询。

## 4. 数据结构 / store

| 表/Store | 说明 |
|---|---|
| `learning_traces` | id, concept_ref, kind, at, session_id, metadata_json |
| `learningTraceStore` | 内存缓存 + SQLite async persist |

## 5. 验收清单

- [ ] 事件 hook：A2 showcase 脚本 replay 后 trace 表有 ≥3 条记录。
- [ ] ingest 产生 `briefing_ingest` 且 `conceptRef` = 新 node id。
- [ ] skip/elaborate 不产生 graph mutation。
- [ ] **记忆引擎**路径无 write `learning_traces`（边界测试 scan）。
- [ ] MCP 不暴露 write trace 工具。
- [ ] Mock-first：无 API key。

## 6. 涉及不变量

- **记忆引擎不写图谱/画像**；LearningTrace 由 app 层写，与 MemoryProvider 分离。
- **入库仍用户确认**；trace 仅记录结果。
- **本地优先**；SQLite 持久化。
- **原始会话不长期存**；trace 存结构化事件，不存全文 transcript。

## 7. 测试（harness）

- `learningTrace.test.ts`：schema、serialize metadata。
- `recordLearningTrace.test.ts`：persist round-trip。
- `learningTraceConductor.integration.test.ts`：A2 脚本 → trace golden。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| conceptRef 歧义（未入库概念） | 允许 `pendingTitle` 字符串，入库后 optional 迁移 |
| trace 爆炸 | 单 session 同 kind 同 item 去重（5min 窗口） |
| 与 profile 蒸馏重复 | 文档区分：trace=显式事件；profile=蒸馏信号 |

## 9. DoD

- `pnpm check` 全绿；trace integration 绿。
- C2/C3 可只读查询 trace。

---

## Harness（验收协议）

### Scope

- **做：** LearningTrace 模型、conductor 挂钩、SQLite、golden replay。
- **不做：** profile 修正 UI、Interview、Weekly review 生成。

### Input fixtures

- A1 voice script + B3 briefing items
- `LEARNING_TRACE_FIXTURES`

### User actions

1. 跑 showcase/radar briefing 脚本（skip → elaborate → ingest）。
2. Harness 查询 `listTracesForConcept`。

### Expected observations

- SQLite `learning_traces` 行数 ≥3。
- kinds 顺序与 golden 兼容（允许额外 node_review 0 条）。

### Assertions

```text
Given showcase briefing script
When replay completes
Then learning_traces count >= 3
And ∃ ingest trace with conceptRef === showcase-ingest-graphiti
And applyGraphMutation only via ingest path
And memoryProvider.remember does not insert learning_traces
```

### Forbidden behaviors

- Trace 写入触发 create node。
- MemoryProvider 写 trace 或 graph。
- MCP create/update trace。
- 存储原始音频/全文到 trace metadata。

### Failure recovery

| 失败 | 行为 |
|---|---|
| SQLite 迁移失败 | 内存-only trace + warn；不阻塞 companion |
| 重复事件风暴 | 去重窗口合并 |

### Verification commands

```bash
pnpm test -- learningTrace recordLearningTrace learningTraceConductor
pnpm check
```

### Out-of-scope

- Profile 修正（C2）。
- Interview Mode（C3）。
- 自动复习推送通知。
- EverMemOS 同步 trace。
