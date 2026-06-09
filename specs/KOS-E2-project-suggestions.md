# KOS-E2 — Project Suggestions 项目 Issue 与 Roadmap（`project-suggestions`）

- **阶段：** KOS-E · **状态：** ✅ 已实现
- **上游：** KOS-E1、KOS-D3、KOS-B3 · **下游：** KOS-F1（边界测试引用）
- **复用：** E1 `CognitiveAction`、`graphContextPack`、B2 外部 trend signals
- **依赖 / 前置里程碑：** **KOS-E1**；**KOS-D3**（weekly next_steps 可引用）；**KOS-B3**（可选 trend item）
- **可并行性：** 与 E3 并行；**共享 E1 schema**

> **定位：** 从图谱 + 近期变更 + 外部 trend 生成 **`project_issue`** / **`roadmap`** 类 CognitiveAction 草稿：含 linked nodes、reason、expected impact、suggested next step。**不创建 GitHub issue**。

## 1. 目标

1. **`generateProjectSuggestions(input)`** → 1–3 条 `CognitiveAction`（deterministic mock）。
2. 每条必填：**`linkedNodeIds`**（≥1）、**`reason`**、**`expectedImpact`**、**`suggestedNextStep`**（structured fields 或 markdown 小节）。
3. 提供 **`PROJECT_SUGGESTIONS_GOLDEN`**（2 条 issue 草稿 snapshot）。
4. UI：**ProjectSuggestionsOverlay** 列表 + 「复制 markdown」；**无**「提交到 GitHub」自动按钮（可 disabled 占位 + 说明需 confirm）。
5. 引用 B3 trend：至少 1 条 suggestion 的 reason 含 `worldItemId` 或 trend title（fixture）。

## 2. 非目标

- 不调用 GitHub REST API / `gh issue create`。
- 不写图谱；不自动改 roadmap 存储。
- 不做 Writing/Research 模式（E3）。
- 不实现 Weekly Review 聚合（D3）。
- Live LLM 非 CI 必过。

## 3. 契约 / 涉及文件

```
src/cognitive/generateProjectSuggestions.ts
src/cognitive/projectSuggestionsGolden.ts
src/actions/createCognitiveAction.ts
src/components/actions/ProjectSuggestionsOverlay.tsx
src/domain/actions/cognitiveAction.ts
```

### 3.1 PROJECT_SUGGESTIONS_GOLDEN（示例）

| actionId | kind | linkedNodeIds | reason 锚点 |
|---|---|---|---|
| `pa-1` | `project_issue` | `demo-agent`, `showcase-ingest-graphiti` | Graphiti + voice demo 引导 |
| `pa-2` | `roadmap` | `demo-mcp`, `demo-agent` | Brain MCP 只读 + agent 接入 |

**硬断言：**

- `permissionLevel === suggest`，`status === draft`。
- `reason` 非空且含节点 title 子串之一。
- 不得出现「你应该更好」类无引用文案（lint 规则或测试 banned phrases）。

## 4. 数据结构 / store

| 字段 | 说明 |
|---|---|
| `CognitiveAction.metadata` | `{ linkedNodeIds, reason, expectedImpact, suggestedNextStep, worldItemId? }` |

## 5. 验收清单

- [ ] generate → 2 条 golden；citations 合法 node ids。
- [ ] store 仅存 draft；confirm 不调用 GitHub（spy 0 calls）。
- [ ] 至少 1 条引用外部 trend fixture id。
- [ ] E1 draft guard 通过。
- [ ] MCP 无 issue create tool。

## 6. 涉及不变量

- **行动建议 ≠ 自动行动**。
- **必须引用图谱节点或来源**（愿景 Milestone E）。
- **Draft-only**。
- **本地优先**。

## 7. 测试（harness）

- `generateProjectSuggestions.test.ts`：golden snapshot。
- `projectSuggestionsBoundary.test.ts`：no GitHub network。
- `projectSuggestionsOverlay.test.tsx`：无 auto-submit 按钮 enabled。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 空泛建议 | golden + banned phrase 测试 |
| 用户误以为已创建 issue | UI 文案「草稿」+ draft badge |

## 9. DoD

- `pnpm check` 全绿；project golden + boundary 绿。

---

## Harness（验收协议）

### Scope

- **做：** project/roadmap draft 生成、golden、overlay、引用约束。
- **不做：** GitHub 集成、graph write、blog（E3）。

### Input fixtures

- A1 graph（+ ingest 后）
- D3 weekly fixture（可选）
- B3 trend item id
- `PROJECT_SUGGESTIONS_GOLDEN`

### User actions

1. 触发「项目建议」/ harness `generateProjectSuggestions`.
2. 查看 overlay；复制 markdown。
3. Harness 断言无 HTTP POST github.com。

### Expected observations

- 2 draft actions in store。
- linked nodes chip 可点击高亮（可选）。

### Assertions

```text
Given showcase graph + trend fixture
When generateProjectSuggestions()
Then actions match PROJECT_SUGGESTIONS_GOLDEN
And ∀ a: a.metadata.linkedNodeIds.length >= 1
And a.status === draft
And githubApiCallCount === 0
And graph unchanged
```

### Forbidden behaviors

- Auto-create GitHub issue。
- Suggestion 无 linkedNodeIds。
- Confirm 无用户事件。
- MCP write issue。

### Failure recovery

| 失败 | 行为 |
|---|---|
| graph 空 | 返回 0 条 + 说明 |
| store 满 | 截断最旧 draft |

### Verification commands

```bash
pnpm test -- generateProjectSuggestions projectSuggestionsBoundary projectSuggestionsOverlay
pnpm check
```

### Out-of-scope

- GitHub OAuth / token 配置。
- Writing mode（E3）。
- 自动 roadmap 写入 SQLite 目标表。
