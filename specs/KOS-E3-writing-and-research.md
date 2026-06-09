# KOS-E3 — Writing & Research 博客草稿与追踪（`writing-and-research`）

- **阶段：** KOS-E · **状态：** ✅ 已实现
- **上游：** KOS-E1、KOS-D1、KOS-D3 · **下游：** KOS-F2（export 消费草稿）
- **复用：** E1 `CognitiveAction`、D1 `sourceRefs`、D3 citations、C3 图谱路径
- **依赖 / 前置里程碑：** **KOS-E1**；**KOS-D1**（引用来源）；**KOS-D3**（可选 week 上下文）
- **可并行性：** 与 E2 并行

> **定位：** 沿图谱路径生成 **`blog_draft`** 与 **`research_followup`** CognitiveAction：Markdown 草稿 + 引用节点/来源；research 列出待追踪 WorldItem 候选（**不写图谱**）。**不自动发布**。

## 1. 目标

1. **`generateBlogDraft({ graph, pathNodeIds, title? })`** → `kind=blog_draft` action，含 outline + sections，每节 citation ≥1 nodeId。
2. **`generateResearchFollowups({ graph, seedNodeId, worldItems })`** → `kind=research_followup` action，列出 3–5 条追踪建议 + 对应 `worldItemId` 或 search query（mock）。
3. **`WRITING_RESEARCH_GOLDEN`**：1 blog + 1 research snapshot（hash 稳定）。
4. UI：**WritingResearchOverlay** 预览 markdown；复制/导出到剪贴板（非发布）。
5. Blog 路径默认：my_brain 相关节点链 `[demo-agent, demo-mcp, showcase-ingest-graphiti, demo-rag]`（ingest 前降级为子集）。

## 2. 非目标

- 不发布 Medium/博客平台；不调 WordPress API。
- 不 create 节点；research 不 ingest WorldItem。
- 不做 Project issue（E2）。
- 不实现全 Web 研究爬虫（仅 fixture WorldItem 列表）。
- Live LLM 非 CI 必过。

## 3. 契约 / 涉及文件

```
src/cognitive/generateBlogDraft.ts
src/cognitive/generateResearchFollowups.ts
src/cognitive/writingResearchGolden.ts
src/components/actions/WritingResearchOverlay.tsx
src/actions/createCognitiveAction.ts
src/domain/graph/sourceRef.ts           # 引用 D1
```

### 3.1 WRITING_RESEARCH_GOLDEN

**Blog draft (`wr-blog-1`):**

- `title`：`my_brain 技术栈：从语音伴侣到知识 OS`
- `sections.length >= 3`
- 每 section `citations` 含合法 nodeId
- `bodyMarkdown` 含 `sourceRefs` 中至少 1 个 url（来自 graphiti）

**Research followup (`wr-research-1`):**

- `items.length === 3`（fixture）
- 每项含 `reason` + (`worldItemId` 或 `query`)
- 不得含已 ingest 的 duplicate concept 为「新发现」（规则检测）

## 4. 数据结构 / store

| CognitiveAction.metadata | 说明 |
|---|---|
| `pathNodeIds` | blog 路径 |
| `sections[]` | `{ heading, body, citations }` |
| `researchItems[]` | `{ label, reason, worldItemId?, query? }` |

## 5. 验收清单

- [ ] Blog golden snapshot 通过；每节有 citation。
- [ ] Research golden 通过；3 条 fixture 引用。
- [ ] 复制 markdown 不改变 graph/action status（仍 draft）。
- [ ] E1 draft guard；无 publish API。
- [ ] sourceRefs 在 blog 末尾「参考来源」节列出（D1）。
- [ ] MCP 只读。

## 6. 涉及不变量

- **Draft-only**；**行动 ≠ 自动行动**。
- **引用真实节点/来源**（愿景）。
- **Research 不写图谱**；follow-up 仅为 Suggest。
- **WorldItem 追踪 ≠ 入库**。

## 7. 测试（harness）

- `generateBlogDraft.test.ts`：golden + citations。
- `generateResearchFollowups.test.ts`：golden + no duplicate ingest。
- `writingResearchOverlay.test.tsx`：copy 不 confirm。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 博客质量参差 | mock 模板 + golden；live 可选 |
| 与 E2 重叠 | E2=项目；E3=表达与研究 |

## 9. DoD

- `pnpm check` 全绿；writing/research golden 绿。
- F2 可 export draft markdown。

---

## Harness（验收协议）

### Scope

- **做：** blog draft、research followup、golden、overlay、source 引用。
- **不做：** 发布、ingest、GitHub issue。

### Input fixtures

- A1 graph post-ingest
- B1 active WorldItems 子集
- `WRITING_RESEARCH_GOLDEN`

### User actions

1. 选择节点路径（或默认 path）→ 生成 blog draft。
2. 对 `demo-rag` 生成 research followups。
3. 复制 markdown。

### Expected observations

- 2 draft actions。
- Blog 含参考来源节。

### Assertions

```text
Given graph + worldItems fixture
When generateBlogDraft and generateResearchFollowups
Then snapshots match WRITING_RESEARCH_GOLDEN
And ∀ section: citations valid node ids
And research items do not call applyGraphMutation
And publishApiCallCount === 0
```

### Forbidden behaviors

- Auto-publish blog。
- Research 自动 ingest WorldItem。
- 无 citation 的 section 进入 golden。
- MCP write draft to graph。

### Failure recovery

| 失败 | 行为 |
|---|---|
| path 含缺失 node | 跳过该节 + warn |
| worldItems 空 | research 降级为 query-only 3 条 |

### Verification commands

```bash
pnpm test -- generateBlogDraft generateResearchFollowups writingResearchOverlay
pnpm check
```

### Out-of-scope

- Project suggestions（E2）。
- Export file bundle（F2 负责格式）。
- 实时 web search API。
