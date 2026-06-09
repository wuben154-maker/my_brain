# KOS-E1 — CognitiveAction Schema 与权限边界（`action-schema`）

- **阶段：** KOS-E · **状态：** ✅ 已实现
- **上游：** KOS-D1、KOS-D3、KOS-A3 · **下游：** KOS-E2、KOS-E3
- **复用：** D3 `WeeklyBrainReview`、C3 `InterviewQuestion`、愿景权限四级模型
- **依赖 / 前置里程碑：** **KOS-D3**（review 作为首类 action）；**KOS-D1** citations
- **可并行性：** E2/E3 依赖本 spec schema

> **定位：** 定义 **`CognitiveAction`** 统一模型与 **权限级别**（Read / Suggest / Auto-organize / User-confirmed write），所有行动层输出均为 **draft-only**，外部写操作 **必须用户确认**。

## 1. 目标

1. **`CognitiveAction`**：`id`、`kind`、`title`、`bodyMarkdown`、`citations[]`、`permissionLevel`、`status`（`draft|confirmed|dismissed`）。
2. **`CognitiveActionKind`** 首版：`weekly_review`、`interview_question`、`project_issue`、`roadmap`、`blog_draft`、`research_followup`、`learning_path`。
3. **`createCognitiveAction(payload)`** 纯函数；默认 `status=draft`、`permissionLevel=suggest`。
4. **`assertActionDraftOnly(action)`** 守卫：禁止 `status=confirmed` 无 user event。
5. 将 D3 weekly review **包装**为 `kind=weekly_review` action（golden 1 条）。

## 2. 非目标

- 不实现 GitHub issue API 调用（E2 仅草稿）。
- 不实现博客发布（E3）。
- 不写图谱（action 存独立表或会话 store，非 KnowledgeNode）。
- 不扩展 Brain MCP 写工具（F1）。
- 不自动 confirm 任何 action。

## 3. 契约 / 涉及文件

```
src/domain/actions/cognitiveAction.ts       # 新增：类型、kind、permission
src/actions/createCognitiveAction.ts          # 新增：工厂 + 校验
src/actions/actionDraftGuard.ts               # 新增：draft-only 断言
src/actions/wrapWeeklyReviewAsAction.ts       # 新增：D3 → action
src/stores/cognitiveActionStore.ts            # 新增：draft 列表，内存+SQLite
src/storage/migrations/cognitive_actions.sql
```

### 3.1 PermissionLevel 映射

| level | 允许行为 | 本 spec |
|---|---|---|
| `read` | 查询图谱 | 不创建 action |
| `suggest` | 生成 draft | **默认** |
| `auto_organize` | post-ingest curate | 非 CognitiveAction；走 graphHistory |
| `user_confirmed_write` | ingest、外部发布 | confirm 事件单独测；action 不自动进入 |

### 3.2 COGNITIVE_ACTION_GOLDEN（weekly_review）

| 字段 | 值 |
|---|---|
| `kind` | `weekly_review` |
| `permissionLevel` | `suggest` |
| `status` | `draft` |
| `citations` | 含 ≥1 `historyEntryId` + ≥1 `nodeId`（来自 D3 golden） |
| `bodyMarkdown` | 与 D3 golden summary 前缀一致（前 80 字 hash 快照） |

## 4. 数据结构 / store

| 表 | 字段 |
|---|---|
| `cognitive_actions` | id, kind, title, body_md, citations_json, status, created_at |

## 5. 验收清单

- [ ] create → 必为 draft + suggest。
- [ ] `confirmAction(id)` 仅.harness/显式 UI 测试调用；无自动调用路径。
- [ ] wrapWeeklyReview 产出 golden action。
- [ ] dismiss 不改变 graph。
- [ ] MCP 无 create/confirm action write（F1 对齐）。
- [ ] 记忆引擎不写 cognitive_actions。

## 6. 涉及不变量

- **行动建议 ≠ 自动行动**（愿景 #7）。
- **Brain MCP 默认 Read**。
- **入库仍用户确认**；action 不能 bypass ingest。
- **本地优先**。

## 7. 测试（harness）

- `cognitiveAction.test.ts`：schema、serialize。
- `actionDraftGuard.test.ts`：禁止 auto-confirm。
- `wrapWeeklyReviewAsAction.test.ts`：D3 → golden action。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| action 与 proposal 混淆 | 命名空间分离；不复活 inbox |
| confirm 误触 | UI 二次确认；单测 scan 无 auto confirm |

## 9. DoD

- `pnpm check` 全绿；draft guard 绿。
- E2/E3 产出均 implements CognitiveAction。

---

## Harness（验收协议）

### Scope

- **做：** CognitiveAction schema、draft-only、store、weekly wrap golden。
- **不做：** GitHub/博客执行、graph mutation。

### Input fixtures

- D3 `WEEKLY_REVIEW_GOLDEN`
- `COGNITIVE_ACTION_GOLDEN`

### User actions

1. `buildWeeklyBrainReview` → `wrapWeeklyReviewAsAction`.
2. Harness 尝试无 user event `confirmAction`（应 fail guard）。

### Expected observations

- store 1 条 draft action。
- graph 不变。

### Assertions

```text
Given D3 review output
When wrapWeeklyReviewAsAction()
Then action matches COGNITIVE_ACTION_GOLDEN
And action.status === draft
When confirmAction without userEvent
Then guard throws or returns blocked
And applyGraphMutation count === 0
```

### Forbidden behaviors

- Auto-confirm on create。
- Action confirm 触发 GitHub API（E2 前无 adapter）。
- Action 写入 KnowledgeNode。
- MCP confirm/write action。

### Failure recovery

| 失败 | 行为 |
|---|---|
| store persist 失败 | 内存 draft + warn |
| invalid citation | create 失败 fast |

### Verification commands

```bash
pnpm test -- cognitiveAction actionDraftGuard wrapWeeklyReviewAsAction
pnpm check
```

### Out-of-scope

- Project issue 内容生成（E2）。
- Blog/research 生成（E3）。
- User confirm UI 完整流程（minimal harness event 即可）。
