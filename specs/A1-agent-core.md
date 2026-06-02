# A1 — Agent 内核骨架（`agent-core`）

- **阶段：** A · **状态：** ✅ 已实现（`src/agent/{types,tools,runner}.ts` + `runner.test.ts`）
- **上游：** `AGENT.md §4` · **下游：** A2（收件箱消费 `ProposalEnvelope`）、A3（实现真正的 `MorningBriefJob`）

## 1. 目标
落地一套**与厂商无关、可调度、可中断、可观测**的 Agent 内核：定义原子能力 `AgentTools`、运行产物 `AgentRunResult`、可调度单元 `AgentJob`，并用三重护栏保证 **Agent 无任何写图谱/画像能力**。纯函数 + mock 单测，零 UI、零真实存储写。

## 2. 非目标
- 不实现真实的 `MorningBriefJob`（A3）。
- 不接 UI、不接调度器、不落库（A2/A4/A5）。
- 不调用真实 OpenAI（用 `createMockLlmProvider`）。

## 3. 接口契约（已实现，作为后续基准）
```ts
// src/agent/types.ts
export type ProposalSource = "voice" | "background_ingest" | "research_loop" | "profile_suggestion";
export type ProposalStatus = "pending" | "approved" | "rejected" | "expired";
export interface ProposalEnvelope {
  id: string; runId: string; createdAt: string;
  source: ProposalSource; status: ProposalStatus;
  proposal: GraphMutationProposal;       // 复用 domain/graph.ts
}
export interface AgentDigest { title: string; sections: AgentDigestSection[]; generatedAt: string; }
export interface AgentTraceStep {
  stepId: string; name: string; startedAt: string; finishedAt: string;
  inputSummary?: string; outputSummary?: string; tokensUsed?: number; error?: string;
}
export interface AgentTools {                         // ← 只读：无 save*/delete*
  fetchNews(): Promise<NewsItem[]>;
  summarize(item: NewsItem): Promise<string>;
  explain(topic: string, profile: UserProfile): Promise<string>;
  propose(context: string): Promise<GraphMutationProposal[]>;
  readGraph(): Promise<BrainGraphSnapshot>;
  readProfile(): Promise<UserProfile>;
}
export interface AgentRunResult {
  runId: string; startedAt: string; finishedAt: string;
  proposals: ProposalEnvelope[]; digest: AgentDigest | null; trace: AgentTraceStep[];
}
export interface AgentJob { readonly id: string; run(tools: AgentTools, signal: AbortSignal): Promise<AgentRunResult>; }

// 编译期护栏
export const AGENT_TOOLS_READ_ONLY: AssertAgentToolsReadOnly = true;
```
```ts
// src/agent/tools.ts
export function createAgentTools(input: CreateAgentToolsInput): AgentTools;          // 委托现有 Provider
export function createAgentToolsFromProviders(llm, news, storage: AgentReadStorage): AgentTools;
export function assertAgentToolsReadOnly(tools: AgentTools): void;                   // 运行期护栏
// src/agent/runner.ts
export function runAgentJob(job, tools, signal?): Promise<AgentRunResult>;           // 内核入口
export function beginTraceStep(name, inputSummary?): TraceStepDraft;
export function finishTraceStep(draft, outputSummary?, tokensUsed?, error?): AgentTraceStep;
export class AgentRunAbortedError extends Error {}
```

## 4. 三重「无写能力」护栏（本里程碑的灵魂）
1. **编译期**：`AssertAgentToolsReadOnly` 类型 + `AGENT_TOOLS_READ_ONLY` 常量。
2. **运行期**：`assertAgentToolsReadOnly(tools)` 扫描 `AGENT_TOOL_WRITE_METHODS`。
3. **源码层**：`runner.test.ts` 用 `readRepoSource` 断言 `runner.ts`/`tools.ts` 不出现 `StorageProvider`/`persistGraphSnapshot`/`applyGraphMutation`。

## 5. 验收清单
- [x] `runAgentJob` 给定 mock 新闻产出非空 `proposals`，且全部 `status==="pending"`、`source==="background_ingest"`。
- [x] 产出 `digest` 与 ≥3 步 `trace`（含 `fetchNews`/`propose`）。
- [x] 运行中不调用任何 `saveConcept`/`saveUserProfile`（spy 断言未被调用）。
- [x] `signal` 已 abort 时抛 `AgentRunAbortedError`。
- [x] 空新闻时 `proposals` 为空、`digest` 为 null。
- [x] 三重护栏测试通过。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 后续有人给 `AgentTools` 加写方法 | 三重护栏 + CI；A2 起新增的写能力只在 `proposalStore`/`StorageProvider`，不进 tools |
| `crypto.randomUUID` 环境差异 | Vite/Tauri/Vitest 均支持；如目标环境缺失再加 polyfill |

## 7. DoD
`pnpm check` 全绿；A2 可直接消费 `ProposalEnvelope` 而无需改本里程碑代码。
