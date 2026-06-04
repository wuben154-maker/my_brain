# V2 — 对话编排状态机（`conversation-conductor`）★心脏

- **阶段：** V · **状态：** ✅ 已实现
- **上游：** V0、V1 · **下游：** V3、V4、V6
- **复用：** `LlmProvider`、`personaPrompt` / C4、`VoiceProvider`（speak/listen/interrupt）、`useVoiceSession`
- **依赖 / 前置里程碑：** **V0**（ImmersiveScene + VoiceOrb）、**V1**（稳定 `companion` 入口）
- **可并行性：** 与 V5/V6 部分并行（V6 高亮需 teaching 态契约先定）；**阻塞 V3/V4**

## 1. 目标
实现 **`ConversationConductor`**：统一编排闲聊、讲资讯、问入库、讲已有知识；全程 **barge-in**；吃 **persona**；与 `VoiceOrb`/沉浸式壳集成。

**伴侣登场（定稿）**：进入 `companion` 后 **主动首条 `Turn` 脚本**（非等按钮），内含 **冷启动「第一颗星」**（PRODUCT §六）：自我介绍 → 快速人格/音色（可指向 SettingsOverlay）→ 兴趣闲聊 → **当场 briefing 一条** → 口播问入库 → 用户「入」后星图中央亮起第一节点（落库走 V3，脚本由本 spec 编排）。冷启动不另立里程碑；用 **`onboarding` 隐式子态** 标记进度（见 §3 `ConversationContext`），**不**新增 `LaunchPhase` 第六态。

**资讯来源（定稿）**：`loading` 抓取结果只写入 `appStore.newsQueue`，由 conductor **`briefing` 消费**；**不**走 A3 晨间简报产提议链（该 job v2 默认关停，见 V4/V7）。

## 2. 非目标
- 不实现三口令解析与落库（V3）；不在此 spec 执行 `applyGraphMutation`（除只读读图）。
- 不实现自动 merge/archive（V4）。
- 不替换 `NewsSource` 抓取逻辑（仍由 `runLaunchSequence` 填 `newsQueue`）；不恢复 A3/C2 **产审批提议** 的后台 job。
- 不做情感陪伴机制（非恋爱向 AI）。

## 3. 契约
```
src/conversation/types.ts
  type ConversationState =
    | "idle_chat"
    | "small_talk"
    | "briefing"
    | "ingest_decision"
    | "teaching";

  type ConversationEvent =
    | { type: "userSpeak"; transcript: string }
    | { type: "userInterrupt" }
    | { type: "newsAvailable"; queueLength: number }
    | { type: "ingestAnswer"; command: IngestCommand }   // V3：ingest|skip|elaborate
    | { type: "ingestReprompt" }                         // V3：歧义后再问一遍
    | { type: "topicRequest"; topic: string; mode?: "single" | "walkthrough" };

  interface ConversationContext {
    newsQueue: NewsItem[];
    newsCursor: number;
    graph: GraphSnapshot;
    profile: UserProfile;
    personaId: string;
    recalledMemories?: string;   // M1 可选注入，无则空
    onboarding: {
      active: boolean;
      step: "intro" | "persona_voice" | "interests" | "first_star" | "done";
    };
  }

  interface Turn {
    say: string;
    expect?: "ingest" | "free";
    highlightNodeIds?: string[];
    nextState?: ConversationState;
  }

src/conversation/ConversationConductor.ts
  class ConversationConductor {
    constructor(deps: {
      llm: LlmProvider;
      voice: VoiceProvider;
      getContext: () => ConversationContext;
      onTurn?: (turn: Turn) => void;
    });
    getState(): ConversationState;
    dispatch(event: ConversationEvent): Promise<void>;
  }

  function nextTurn(
    state: ConversationState,
    event: ConversationEvent,
    ctx: ConversationContext,
    llm: LlmProvider,
  ): Promise<Turn>;   // 纯函数核心，供单测

src/stores/conversationStore.ts
  interface ConversationStoreState {
    turns: Array<{ role: "user" | "assistant"; text: string; at: string }>;
    currentState: ConversationState;
    currentNewsItem: NewsItem | null;
    setState(s: ConversationState): void;
    appendTurn(role, text): void;
  }

src/hooks/useConversationSession.ts
  // 绑定 conductor + voice 事件：userSpeak → dispatch；speaking 时 userInterrupt → interrupt + dispatch
  // 播放 Turn.say 经 voice.speak；expect==='ingest' 时进入 listen 等 ingestAnswer（V3 解析后 dispatch）
```

- **冷启动脚本（`onboarding.active === true` 时优先）**：
  - `companion` 首条 Turn：`intro` 文案（邀起名）→ `persona_voice` 可跳过（Settings 已选则略过）→ `interests` 2–3 轮 `small_talk` → `first_star`：强制进入 `briefing`（`newsQueue[0]`）→ `ingest_decision` → V3「入」后 `onboarding.step = "done"` 且星图高亮首节点。
- **状态迁移（最小完备路径，实现不得少于此覆盖）**：
  - `idle_chat` + `userSpeak`（寒暄）→ `small_talk` → `say` + `expect: free`
  - `small_talk` + `newsAvailable` / 用户要听资讯 → `briefing`：取 `newsQueue[cursor]` 讲解
  - `briefing` 讲完 → `ingest_decision`：`say` 含「入库?」+ `expect: ingest`
  - `ingest_decision` + `ingestReprompt`（V3）→ 同态再问「入库?」
  - `ingest_decision` + `ingestAnswer`（V3）→ 回 `briefing` 下一条或 `idle_chat`；`onboarding.first_star` 完成时庆祝 Turn
  - `topicRequest` → `teaching`：`highlightNodeIds` 由 `graphOutline`/召回决定（V6 消费）
  - 任意说话态 + `userInterrupt` → 停播、保持或回退到可听态（单测断言 `interrupt` 调用）
- Persona：`nextTurn` 构造 prompt 时走 `buildExpressionPlan` + `applyPersonaStyle`（C4）。
- Mock LLM：返回可预测多轮 JSON/文本，使状态机路径可单测不触网。

## 4. 数据结构 / store
| 组件 | 职责 |
|---|---|
| `conversationStore` | UI 字幕/调试；`currentState`、`currentNewsItem` |
| `appStore.newsQueue` | briefing 数据源（只读） |
| `graphStore` | teaching 只读；高亮写入 `highlightedNodeIds`（与 V6 共享） |

## 5. 验收清单
- [x] `nextTurn` / conductor **全路径单测**（含 interrupt、briefing→ingest_decision→继续）。
- [x] mock 场景：多轮闲聊 ↔ 资讯 briefing 自由切换，无死锁状态。
- [x] barge-in：播报中 `userInterrupt` → `voice.interrupt()` 被调用且下一事件为 listen（mock 断言）。
- [x] persona 切换改变 `say` 口吻（同输入不同 preset，测试 snapshot 或关键词）。
- [x] 进入 `companion` 后 **主动首句**（非空 turn）。
- [x] **冷启动当场点亮第一颗星**：空图状态下走完 onboarding 脚本 + 用户语音「入」→ 星图新增首节点且 `onboarding.step === "done"`（`ingestActions.test.ts` 空图 + `nextOnboardingAfterEvent`；conductor `first_star` 联测）。
- [x] conductor **不调用** `applyGraphMutation` / `persistGraphSnapshot`（新建节点仅 V3）。

## 6. 涉及不变量
- **可打断语音**（硬需求）。
- **入库=用户确认**：`ingest_decision` 仅口播询问，落库由 V3 在确认后执行。
- Agent/记忆：**conductor 不写图谱**；记忆引擎仍只读注入（M 系列）。
- Provider 可替换；mock-first。

## 7. 测试（harness）
- `conversationConductor.test.ts`：状态表驱动全路径。
- `nextTurn.test.ts`：纯函数 + mock LLM fixture。
- `useConversationSession.test.ts`：interrupt 接线。
- 扩展 `productInvariants.test.ts`：conductor 源无 `applyGraphMutation`。

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| 与旧 `useNewsIngestSession` 双轨 | V3 收敛 ingest；V0–V2 间可 feature flag |
| Realtime 与 speak/listen 分裂 | mock 先统一；真 API 验收清单归 V7 |

## 9. DoD
`pnpm check` 全绿；mock 多轮对话可演示；`conversationConductor.test.ts` 全路径绿；满足 §5 全部 MUST 项。
