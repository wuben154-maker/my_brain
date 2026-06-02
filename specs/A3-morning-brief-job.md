# A3 — 晨间简报 Job（`morning-brief`）

- **阶段：** A · **状态：** ✅ 已实现（`src/agent/jobs/{morningBriefJob,dedupeNews}.ts` + 单测）
- **上游：** A1（内核）、A2（收件箱）· **下游：** A4（展示）、A5（调度）、C1（画像打分增强）

## 1. 目标
实现第一个真正的 `AgentJob`：`MorningBriefJob` —— 抓取 → **去重**（对比现有图谱）→ 对 Top-N 调 `summarize`+`propose` → 产出 `AgentDigest`（晨间简报）+ 一批 `ProposalEnvelope`（`source:"background_ingest"`），全程带 **token 预算护栏**。

## 2. 非目标
- 不做画像打分排序（C1，A3 先用简单时间/来源排序）。
- 不直接落库（只产 `AgentRunResult`，由 A2 收件箱写入）。
- 不接调度（A5）。

## 3. 接口契约
```ts
// src/agent/jobs/morningBriefJob.ts
export interface MorningBriefConfig {
  topN: number;                 // 默认 5
  tokenBudgetPerRun: number;    // 默认如 8000，超限优雅截断
  maxProposals: number;         // 每日提议上限，防确认疲劳
}
export function createMorningBriefJob(config?: Partial<MorningBriefConfig>): AgentJob;
```
去重策略（纯函数，单测）：
```ts
// src/agent/jobs/dedupeNews.ts
export function dedupeAgainstGraph(news: NewsItem[], graph: BrainGraphSnapshot): NewsItem[];
// key：sourceUrl 完全匹配 OR 标题与现有 node.title 高相似（先做规范化精确匹配，模糊留 TODO）
```
预算护栏：累计 `trace[].tokensUsed` 超 `tokenBudgetPerRun` 即停止后续 `summarize/propose`，已产出的正常返回，并在 `trace` 记一条 `name:"budget_truncated"`。

## 4. 运行流程
```
fetchNews → dedupeAgainstGraph(readGraph) → 排序取 topN
  → for each（预算内）：summarize → propose(context=新闻+相关现有节点)
  → 汇总 proposals(source=background_ingest,status=pending) + digest(sections=每条标题+摘要)
  → 返回 AgentRunResult（含完整 trace）
```

## 5. 验收清单
- [x] mock 下产出 `digest`（sections 数 = 实际处理条数）+ 非空 pending 提议。
- [x] 与现有图谱 sourceUrl 重复的新闻被 `dedupeAgainstGraph` 过滤。
- [x] 累计 token 超 `tokenBudgetPerRun` 时优雅截断，`trace` 含 `budget_truncated`。
- [x] 提议数被 `maxProposals` 截断。
- [x] 运行全程不触碰存储写（沿用 A1 护栏断言）。
- [x] `signal` abort 时尽快停止并抛 `AgentRunAbortedError`。

## 6. 测试（`morningBriefJob.test.ts` / `dedupeNews.test.ts`）
- 去重纯函数表驱动用例；预算截断；maxProposals 截断；空新闻；abort。

## 7. 风险与对策
| 风险 | 对策 |
|---|---|
| 成本失控 | 预算护栏 + maxProposals + mock 优先；token 计入 trace 做 CI 回归 |
| 与 `runLaunchSequence` 抓取重复请求 | 共用 `NewsSourceRegistry`；Job 幂等；A5 加运行锁 |
| 去重漏判致重复节点 | 先精确匹配；模糊匹配作为后续增强，宁可少建不可乱建（建错由用户拒绝） |

## 8. DoD
`pnpm check` 全绿；A4 能展示本 Job 产出的简报与提议。
