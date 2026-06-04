# V3 — 语音入库决策（`voice-ingest`）

- **阶段：** V · **状态：** ✅ 已实现
- **上游：** V2 · **下游：** V4
- **复用：** V2 `ingest_decision`、`useNewsIngestSession` / `ingestStore`、`graphMutations`
- **依赖 / 前置里程碑：** **V2**（conductor 态与 `expect: 'ingest'`）
- **可并行性：** 与 V6 视觉可并行；**阻塞 V4**

## 1. 目标
在 **briefing** 每条资讯讲完後，口播「入库?」；用户语音 **「入 / 不要 / 讲细点」** 经 `parseIngestCommand` 解析；**「入」** → 创建 **概念节点**（附来源链接）并经 **`applyGraphMutation(create)` + `persistGraphSnapshot`** 落库（复用 `useNewsIngestSession` / `ingestStore` 成熟路径）；**「讲细点」** → 更深讲解后再次询问；**「不要」** → 丢弃继续下一条。Conductor 在 **`ingest_decision`** 态消费 `ingestAnswer` 事件。

## 2. 非目标
- 不自动 merge/link/archive（V4）。
- 不产 `ProposalEnvelope` 进收件箱（v2 主流程无审批 UI）。
- 不改节点语义：仍是概念+简介+来源链接，非新闻碎片。

## 3. 契约
```
src/lib/parseIngestCommand.ts
  export type IngestCommand = "ingest" | "skip" | "elaborate";
  export type IngestParseResult =
    | { kind: "command"; command: IngestCommand }
    | { kind: "reprompt" };   // 歧义：再问一遍（非 skip）

  export function parseIngestCommand(
    transcript: string,
    attempt: 1 | 2,
  ): IngestParseResult;
  // 规则：含「入」「要」「收录」且无否定 → ingest；含「不要」「跳过」「算了」→ skip；
  //       含「细」「展开」「多说」→ elaborate；
  //       歧义且 attempt===1 → reprompt；歧义且 attempt===2 → command skip

src/conversation/ingestActions.ts
  async function applyIngestDecision(
    command: IngestCommand,
    item: NewsItem,
    deps: { storage, graphStore, llm, profile, memory? },
  ): Promise<{ turn: Turn; event?: ConversationEvent }>;

src/hooks/useNewsIngestSession.ts
  // 收敛：UI 面板路径废弃后，核心 apply/create 逻辑抽出为 applyIngestCreate(item)
  // ingestStore：cursor、ingestedIds、skippedIds、explanation 仍用
```

- **「入」落库**：
  ```
  proposal = buildCreateProposalFromNews(item, explanation)  // 现有或等价纯函数
  after = applyGraphMutation(before, proposal)
  persistGraphSnapshot(storage, before, after)
  graphStore.setGraph(after)
  ingestStore.markIngested(item.id)
  dispatch({ type: "ingestAnswer", command: "ingest" })  // 触发 V4 autoCurate（V4 订阅）
  ```
- **「讲细点」**：`ingestStore` 标记 `elaborationDepth++`；`llm.explainConcept` 更深一层；conductor 回 `ingest_decision` 再问。
- **`reprompt`**：`parseIngestCommand` 返回 `{ kind: "reprompt" }` → `applyIngestDecision` 不落库，向 conductor 返回 `event: { type: "ingestReprompt" }`；`ingestParseAttempt` 置 2 后再次 `userSpeak`。
- **来源链接**：create payload 必须含 `sourceUrl`（来自 `NewsItem.url`）。

## 4. 数据结构 / store
| Store | 字段 |
|---|---|
| `ingestStore` | `cursor`, `ingestedIds`, `skippedIds`, `explanation`, `elaborationDepth`, `ingestParseAttempt`（1 或 2） |
| `conversationStore` | `currentNewsItem` 与 cursor 同步 |
| `graphStore` | 落库后可见节点增加 |

## 5. 验收清单
- [x] `parseIngestCommand` 单测：三口令与常见中文变体正确分类；**歧义首次 → `reprompt`**，二次仍歧义 → `skip`。
- [x] conductor 收到 `reprompt` 时 dispatch `ingestReprompt`，同条资讯再次口播「入库?」（`ingestParseAttempt` 复位为 2）。
- [x] mock 路径「入」：星图新增节点，简介非空，**来源链接**可断言。
- [x] **冷启动当场点亮第一颗星**：在 V2 onboarding `first_star` 步，用户「入」后首节点出现在空图中央（与 V2 联测）。
- [x] 「不要」：不新增节点，`skippedIds` 含 id，进入下一条资讯。
- [x] 「讲细点」：同条资讯二次讲解文案更长（或 mock 标记 depth），再次进入 ingest 问句。
- [x] 无路径绕过用户确认自动 create（扫描 `applyGraphMutation` 调用栈仅 ingest 模块 + V4 整理类 mutation）。

## 6. 涉及不变量
- **入库 = 用户语音确认**（v2 保留的唯一确认门控）。
- **节点 = 概念 + 简介 + 来源链接**；删除=归档（create 不硬删）。
- 记忆引擎不写图谱；ingest 不写原始全文入图谱（仅链接+蒸馏简介）。

## 7. 测试（harness）
- `parseIngestCommand.test.ts`
- `ingestActions.test.ts`：三口令与 persist 一致性（对齐 `proposalStore` approve 快照测试模式）
- 集成：`conversationConductor` + ingest 路径 mock 多轮

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| 口令误识别 | 首次 reprompt；二次仍不清才 skip |
| 与 proposal 双轨 | V7 删 inbox 主路径；ingest 即唯一 create 出口 |

## 9. DoD
`pnpm check` 全绿；mock 演示「讲资讯 → 入库? → 入 → 星图亮新节点」；三口令单测全绿。
