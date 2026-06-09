# KOS-C3 — Interview Mode 面试模式（`interview-mode`）

- **阶段：** KOS-C · **状态：** ✅ 已实现
- **上游：** KOS-C1、KOS-C2、KOS-D1 · **下游：** KOS-E1、KOS-E3
- **复用：** `graphContextPack`、`ConversationConductor`、C2 `teachingDepth`
- **依赖 / 前置里程碑：** **KOS-C1/C2**（profile + trace）；**KOS-D1**（节点 sourceRefs 供引用）
- **可并行性：** 与 E1 设计可并行；**问题生成依赖 graph + profile 只读**

> **定位：** 基于 **当前已确认图谱** 与 **profile 理解程度**，生成 **≥5 个 my_brain 相关面试追问** + **回答框架**（非自动评分）。每个问题必须 **引用真实 node id 或 Decision/SourceRef**。

## 1. 目标

1. 定义 **`InterviewQuestion`**：`id`、`prompt`、`linkedNodeIds`、`linkedSourceRefs`、`depth`、`followUps[]`。
2. 实现 **`generateInterviewPack(graph, profile, { project: 'my_brain' })`** → mock 确定性 ≥5 题。
3. Conductor 子态 **`mode: interview`**：逐题讲解 / 用户跳过 / 下一题。
4. 提供 **`INTERVIEW_PACK_GOLDEN`** snapshot（5 题 id + prompt 前缀 + linkedNodeIds）。
5. UI：临时浮层列表，不新增 dashboard 页。

## 2. 非目标

- 不做自动打分或 LLM judge（后续 eval 顺延）。
- 不写图谱；不自动创建 Question 节点（D 系列后可评估，本 spec 不持久化 Question 类型）。
- 不做 Project Mode / issue 草稿（E2）。
- 不依赖 live LLM（mock pack 为 CI 真源）。
- 不做固定模板题（「什么是 RAG」无 linkedNodeIds 禁止）。

## 3. 契约 / 涉及文件

```
src/domain/actions/interviewQuestion.ts     # 新增：类型
src/cognitive/generateInterviewPack.ts      # 新增：mock 规则生成
src/cognitive/interviewPackGolden.ts        # 新增：INTERVIEW_PACK_GOLDEN
src/conversation/ConversationConductor.ts   # 扩展：interview 子态
src/components/interview/InterviewOverlay.tsx # 新增：浮层
src/lib/graphContextPack.ts                 # 只读
```

### 3.1 INTERVIEW_PACK_GOLDEN（结构示例）

| qId | prompt 前缀（中文） | linkedNodeIds |
|---|---|---|
| `iq-1` | `为什么 my_brain 选择 OpenAI Realtime 而不是…` | `demo-agent`, `showcase-ingest-graphiti`（若已 ingest） |
| `iq-2` | `解释用户确认入库与自动整理…` | `demo-agent`, `demo-mcp` |
| `iq-3` | `MemoryProvider 与 autoCurate 的边界…` | `demo-mcp` |
| `iq-4` | `Barge-in 在产品里为什么硬需求…` | `demo-agent` |
| `iq-5` | `如果不用普通 RAG，你怎么向面试官解释…` | `demo-rag`, `demo-llm` |

**硬断言：** 每题 `linkedNodeIds.length >= 1`；`prompt` 非空；5 题 qId 固定。

### 3.2 Profile 深度联动

- `can_explain` 概念相关题：`depth = 'advanced'`，followUps 含架构追问。
- `unfamiliar`：同题增加 `scaffold` 子提示（不降低 linkedNodeIds 要求）。

## 4. 数据结构 / store

| Store | 字段 |
|---|---|
| `interviewStore.session` | `questions[]`, `cursor`, `skippedIds` |
| 持久化 | 可选会话级 JSON；默认不长期存答案音频 |

## 5. 验收清单

- [ ] `generateInterviewPack` 输出 === golden snapshot（mock 路径）。
- [ ] 每题 linkedNodeIds 均存在于输入 graph。
- [ ] Showcase 路径：ingest graphiti 后 iq-1 仍合法（节点 id 存在）。
- [ ] 用户「跳过」仅 advance cursor，无 graph write。
- [ ] **Draft-only**：无外部发布、无 MCP write。
- [ ] C2 profile 变更后 regenerate：至少 1 题 depth/scaffold 变化可测。

## 6. 涉及不变量

- **问题必须引用真实图谱**（愿景 Milestone C/E）。
- **新建节点仍用户确认**；interview 不 create。
- **行动建议 ≠ 自动行动**；interview 仅 Suggest/Read 层讲解。
- **语音可打断**；interview 口播可 interrupt。
- **Brain MCP 只读**。

## 7. 测试（harness）

- `generateInterviewPack.test.ts`：golden snapshot。
- `interviewConductor.integration.test.ts`：进入模式 → 5 题 → skip 不写 graph。
- `interviewProfileDepth.test.ts`：C2 level 影响 scaffold。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| Live LLM 题不稳定 | CI 仅 mock；live 为 optional eval |
| 空图无法生成 | fail-fast 友好文案 + harness 用 A1 graph |
| Question 节点类型膨胀 | 本 spec 不持久化 Question |

## 9. DoD

- `pnpm check` 全绿；interview golden 绿。
- README/DEMO 可引用「面试模式」步骤（A4 后续补一句，本 spec 不改正文）。

---

## Harness（验收协议）

### Scope

- **做：** interview pack 生成、5 题 golden、conductor 子态、浮层 UI。
- **不做：** 自动评分、Question 节点类型、issue/博客（E 系列）。

### Input fixtures

- A1 `SHOWCASE_GRAPH_SNAPSHOT`（+ 可选 post-ingest graph）
- C2 profile variants
- `INTERVIEW_PACK_GOLDEN`

### User actions

1. 语音或 harness 触发「面试模式」/「考考我」。
2. 浏览 5 题；跳过 1 题；下一题。
3. （可选）修改 profile 后 regenerate。

### Expected observations

- Overlay 5 条 prompt；每条显示关联概念 chip（node title）。
- skip 后 cursor+1；graph 不变。

### Assertions

```text
Given SHOWCASE_GRAPH + DEFAULT_PROFILE
When generateInterviewPack()
Then questions.length >= 5
And ∀ q: q.linkedNodeIds.every(id => graph.hasNode(id))
And snapshot matches INTERVIEW_PACK_GOLDEN
When user skips q1
Then graphStore unchanged
```

### Forbidden behaviors

- 问题无 linkedNodeIds。
- 固定泛化模板（无 graph 引用）进入 golden。
- Interview 路径 create/merge/archive。
- MCP 写 interview 答案到 graph。

### Failure recovery

| 失败 | 行为 |
|---|---|
| graph 节点不足 | 提示「先入库更多概念」；≥3 题降级（测试夹具禁止） |
| speak 失败 | 仅文字 overlay |

### Verification commands

```bash
pnpm test -- generateInterviewPack interviewConductor interviewProfileDepth
pnpm check
```

### Out-of-scope

- CognitiveAction schema（E1）。
- 自动 GitHub issue / 博客（E2/E3）。
- 语音录音回放持久化。
- Live LLM 生成题为 CI 必过项。
