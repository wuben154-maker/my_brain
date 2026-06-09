# KOS-C2 — Profile 查看与修正（`profile-correction`）

- **阶段：** KOS-C · **状态：** ✅ 已实现
- **上游：** KOS-C1、KOS-A1、KOS-B3 · **下游：** KOS-C3
- **复用：** V5 `profileStore`、`DEFAULT_USER_PROFILE`、briefing feedback（B3）
- **依赖 / 前置里程碑：** **KOS-C1**（trace 只读参考）；**KOS-A1** profile fixture
- **可并行性：** UI 可与 C3 并行；**逻辑依赖 profile store 已有**

> **定位：** 用户可 **查看**「系统以为我懂什么/喜欢什么」，并 **修正** 兴趣与理解程度；修正后 **下一轮** briefing 排序与讲解深度 **可测变化**。画像蒸馏仍静默（V5），但 **用户显式修正优先于蒸馏冲突项**。

## 1. 目标

1. **`ProfilePanel`** 浮层：展示 interests、understanding levels（未接触/听过/能解释）、讲解偏好。
2. **`applyProfileCorrection(patch)`**：用户确认后写入 profile store + SQLite；记录 `correctionAt`。
3. **可测联动**：修正 `demo-rag` 为「能解释」后，mock teaching 不得重复基础定义（golden 文案 diff）。
4. **可测联动**：修正兴趣权重后，下一轮 briefing/rerank consumer 的 top3 顺序变化（deterministic）；不反向修改 B2 依赖。
5. 支持 **撤销最近一次修正**（单步，非 redo 栈）。

## 2. 非目标

- 不重新定义 LearningTrace（C1）。
- 不让用户编辑图谱节点（手动 edit 沿用既有能力，非本 spec）。
- 不实现 Interview Mode（C3）。
- 不修改 V5 蒸馏 pipeline 架构（仅定义冲突优先级：user correction > distilled）。
- 不让记忆引擎写 profile（蒸馏出口仍 V5；本 spec 为 UI 显式写）。

## 3. 契约 / 涉及文件

```
src/domain/profile/userProfile.ts          # 扩展：UnderstandingLevel、ProfileCorrection
src/stores/profileStore.ts                 # 扩展：applyCorrection、undoLastCorrection
src/components/profile/ProfilePanel.tsx    # 新增：查看/修正 UI
src/conversation/teachingDepth.ts          # 新增：profile → depth 纯函数
src/radar/mockRelevanceScorer.ts           # 可选兼容测试：读 profile.interestWeights，不让 B2 依赖 C2
src/showcase/showcaseFixtures.ts           # 引用：DEFAULT_USER_PROFILE
```

### 3.1 UnderstandingLevel

| level | 讲解策略（mock golden） |
|---|---|
| `unfamiliar` | 含基础定义句「RAG 是检索增强生成…」 |
| `heard` | 跳过定义，讲用例 |
| `can_explain` | 跳过定义与用例，讲架构取舍/与项目关系 |

### 3.2 PROFILE_CORRECTION_GOLDEN

**Given：** `demo-rag` 初始 `heard`

**When：** 用户修正为 `can_explain` + 保存

**Then：** 下一次 `buildTeachingTurn('demo-rag')` 输出 **不得** 包含子串 `RAG 是检索增强生成`

**And：** `profileStore.corrections[-1].field === 'understanding.demo-rag'`

### 3.3 Interest correction golden

**When：** 将 `voice_realtime` 兴趣 weight 0.2 → 0.9

**Then：** 在 C2 兼容测试中，rerank 后 `radar-wi-rel-realtime` 排名上升 ≥2 位（mock 规则）。该测试消费 B2 scorer，但不把 B2 列为 C2 下游。

## 4. 数据结构 / store

| 字段 | 说明 |
|---|---|
| `profile.interests` | `{ id, label, weight }[]` |
| `profile.understanding` | `Record<conceptId, UnderstandingLevel>` |
| `profile.explainPrefs` | 比喻/源码/架构/面试优先 |
| `profile.lastCorrection` | undo 用快照 |

## 5. 验收清单

- [ ] ProfilePanel 可读展示 A1 默认 profile 字段。
- [ ] 修正保存后 SQLite 持久化；刷新后仍生效。
- [ ] Teaching depth golden（§3.2）通过。
- [ ] Rerank golden（§3.3）通过。
- [ ] undo 恢复上一 profile 快照。
- [ ] **记忆引擎**不写 profile（scan）；蒸馏与用户修正冲突时 user 优先（单测）。
- [ ] 不变量：修正不 create/delete graph 节点。

## 6. 涉及不变量

- **画像长期保存、可查看可修正**（愿景）。
- **画像蒸馏静默**（V5）；本 spec 为显式用户写入口。
- **记忆引擎不写图谱/画像**（蒸馏若经 V5 合法出口；EverMemOS 仍不写 profile 表）。
- **Provider 可换**；teaching 深度纯函数可 mock。

## 7. 测试（harness）

- `profileCorrection.test.ts`：patch、undo、持久化。
- `teachingDepth.test.ts`：三级 profile golden 文案。
- `profileRerank.integration.test.ts`：interest 权重 → top3 变化。

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 画像 UI 过大 | 浮层分区；星图主界面不变 |
| 修正与蒸馏打架 | 文档 + 单测：`correctedFields` 跳过蒸馏覆盖 |
| 过度拟合 demo-rag | golden 仅 1 概念；其余 smoke |

## 9. DoD

- `pnpm check` 全绿；correction + teaching + rerank 测试绿。
- C3 可读 `profile.understanding` 生成面试题深度。

---

## Harness（验收协议）

### Scope

- **做：** profile 查看/修正/undo、teaching depth、rerank 联动。
- **不做：** LearningTrace 记录（C1）、Interview UI（C3）、graph edit。

### Input fixtures

- A1 `DEFAULT_USER_PROFILE`
- `PROFILE_CORRECTION_GOLDEN`
- B2 ranking + C1 可选 trace（只读）

### User actions

1. 打开 ProfilePanel。
2. 将 `demo-rag` 改为 `can_explain`；保存。
3. 触发同一概念讲解 turn（harness）。
4. （可选）调高 `voice_realtime` 兴趣；rerank。
5. 点击 undo 修正。

### Expected observations

- Panel 显示修正后 level。
- Teaching 文案无基础定义句。
- Rerank 顺序变化；undo 后恢复。

### Assertions

```text
Given demo-rag level heard
When applyProfileCorrection(can_explain) and buildTeachingTurn
Then output excludes RAG_BASIC_DEFINITION_SUBSTRING
When undoLastCorrection
Then profile.understanding.demo-rag === heard
And graph node count unchanged
```

### Forbidden behaviors

- 修正静默生效无 UI 确认。
- Profile 修正直接写 KnowledgeNode。
- MemoryProvider 覆盖 user-corrected field（单测禁止）。
- MCP 写 profile。

### Failure recovery

| 失败 | 行为 |
|---|---|
| persist 失败 | 内存生效 + 警告 banner |
| panel 加载失败 | 设置页降级只读展示 |

### Verification commands

```bash
pnpm test -- profileCorrection teachingDepth profileRerank
pnpm check
```

### Out-of-scope

- Interview Mode（C3）。
- 多步 correction 历史浏览。
- 导出 profile 到 Markdown（F2）。
- 自动从 trace 推断 profile（仅 V5 蒸馏）。
