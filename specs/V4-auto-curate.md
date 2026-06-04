# V4 — 入库后自动整理（`auto-curate`）★覆盖旧铁律 #3/#6

- **阶段：** V · **状态：** ✅ 已实现
- **上游：** V3 · **下游：** V7
- **复用：** `agent/curation/detectStale`、`scoreNews`、`lib/salience`、`applyGraphMutation`
- **依赖 / 前置里程碑：** **V3**（用户确认 create 之后触发）
- **可并行性：** 与 **V5** 可并行（画像蒸馏独立）

> **显式覆盖声明（相对 A2/C2 与旧 `specs/README` 不变量 #2）**  
> v2 产品决策：**入库后的 merge / link / archive / attach / edge-migrate 由 AI 自动执行，无需用户确认。**  
> 本 spec **取代**「任何图谱结构变更一律先建议后确认」在**入库后整理**场景下的适用性。  
> **不变式仍保留**：**新建概念节点**仅能通过 V3 用户语音确认；**记忆引擎（M 系列）仍绝不写图谱/画像**；**agent/curation 层**获授权在此路径直接 `apply`（非 proposal 队列）。

## 1. 目标
用户确认入库后，立即运行 **`autoCurate(graph, newNode, profile)`** → `GraphMutation[]`，**直接 `applyGraphMutation` + persist**（不产 `ProposalEnvelope`、不进收件箱）。实现兜底三件套：**归档=隐藏**；**每次变更进 `graphHistoryStore` 且可 `undo(mutationId)`**；conductor **节流口播**汇报「我把 X 并进了 Y」。

## 2. 非目标
- 不再为主流程生成待审批提议；`ProposalInbox` / A4 抽屉从主渲染下线（V7 删代码）。
- 不自动 **create** 新概念（create 仅 V3）。
- 不改 EverMemOS 记忆边界（不写图谱）。
- **v2 默认关停**产审批提议的后台 job：**A3 晨间简报提议链**、**C2 主动归档提议**（scheduler 见 V7）；**无任何静默提议**写入 `agent_proposals` 待审批态。

## 2b. 后台与资讯（定稿）
| 能力 | v2 处置 |
|---|---|
| 资讯抓取（`runLaunchSequence` / NewsSource） | **保留** → 只填 `appStore.newsQueue` → V2 `briefing` |
| A3 晨间简报 + 产 `ProposalEnvelope` | **关停**（或 scheduler 不注册） |
| C2 主动归档提议 | **关停**；过时节点由 **`autoCurate`/`detectStale` 直接 archive** 取代 |
| A5 scheduler | 仅保留与 v2 兼容的 job（若有）；**禁止**注册产提议 job |

## 3. 契约
```
src/agent/curation/autoCurate.ts
  export function autoCurate(
    graph: GraphSnapshot,
    newNode: GraphNode,
    profile: UserProfile,
    signals?: { stale: StaleFinding[]; scores: NewsScore[] },
  ): GraphMutationProposal[];   // 仅 proposal 形状，调用方直接 apply，不持久化到 agent_proposals 表

src/lib/runAutoCuratePipeline.ts
  async function runAutoCurateAfterIngest(
    newNodeId: string,
    deps: { storage, graphStore, profile, llm? },
  ): Promise<GraphHistoryEntry[]>;

src/stores/graphHistoryStore.ts
  // 定稿：每条记录存 **全量 before/after 快照**（与 persistGraphSnapshot 一致），undo = 恢复 before 并 persist。
  // 可逆 op 日志为后续优化项，本里程碑不做。
  interface GraphHistoryEntry {
    id: string;
    at: string;
    kind: GraphMutationKind;
    summary: string;           // 中文，供 UI/语音
    before: GraphSnapshot;     // 全量快照（必填）
    after: GraphSnapshot;      // 全量快照（必填）
    undone?: boolean;
  }
  undo(mutationId: string): Promise<GraphSnapshot>;

src/conversation/curationReport.ts
  shouldSpeakCurationReport(entry: GraphHistoryEntry, lastSpokenAt: number): boolean;
  formatCurationReport(entry): string;   // 节流：同会话最多每 120s 一条，合并多条摘要
```

- 信号复用：`detectStaleNodes`、`scoreNews`（C1）、`salience` 权重，但输出 **直接 apply**。
- **archive**：`node.archived = true`，可见图过滤；**非** SQL DELETE。
- **merge + edge-migrate**：沿用 `graphMutations` 现有语义。
- V2 conductor：监听 `runAutoCurateAfterIngest` 完成 → 可选 `Turn.say` 汇报（非阻塞主对话）。

## 4. 数据结构 / store
| Store | 职责 |
|---|---|
| `graphHistoryStore` | 内存 + SQLite 表 `graph_history`（migration 本 spec 定义） |
| `graphStore` | apply 后 `setGraph` |
| `proposalStore` | 主流程不再 `approve`；**禁止**后台 `saveProposal` 待审批（V7：`agent_proposals` 只读 legacy） |

## 5. 验收清单
- [ ] 入库 mock 后：自动 link/merge/archive 至少一种在单测 fixture 中生效。
- [ ] archive 节点在 `visibleGraph` 中隐藏，`loadGraph` 可恢复。
- [ ] 每次 auto apply 产生 **一条** `GraphHistoryEntry`；`undo(id)` 后快照 === entry.before（单测）。
- [ ] 连续整理 N 次口播汇报 ≤ 节流上限（mock clock）。
- [ ] **无任何静默提议**：主流程与 scheduler **均不** `saveProposal(..., status:'pending')`（invariant + job 注册表扫描）。
- [ ] **无** inbox UI / `approve` 主路径（静态扫描）。
- [ ] `productInvariants` 更新：区分「ingest create 需确认」与「post-ingest curate 可自动」。

## 6. 涉及不变量（v2 口径）
- 入库=用户确认；**入库后整理=自动**（本 spec）。
- 删除=归档；边迁移；节点=概念+简介。
- Agent **无**静默 create；**有**整理类写能力（本 spec 授权）。
- 记忆引擎不写图谱/画像。

## 7. 测试（harness）
- `autoCurate.test.ts`：给定图+新节点，mutation 列表可预期。
- `graphHistoryStore.test.ts`：记录与 undo 往返。
- `runAutoCuratePipeline.test.ts`：与 persist 一致性。
- `curationReport.test.ts`：节流。

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| 非原子 persist（已知债务 H2-storage） | undo 用快照；H5 事务化顺延 |
| 误 merge | history + undo + 口头汇报 |
| 与 A2 proposal 历史并存 | `agent_proposals` 只读 legacy，不删表（V7） |

## 9. DoD
`pnpm check` 全绿；mock「入→自动合并」可演示；undo 单测绿；spec 覆盖声明已写入本文件 § 显式覆盖。
