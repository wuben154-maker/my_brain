# B1 — 多步研究 Job（`research-loop`）

- **阶段：** B · **状态：** 📝 待做
- **上游：** A1（内核）、A2（收件箱）、B2（LLM 扩展）· **下游：** B3（轨迹可视化）

## 1. 目标
实现 `TopicResearchJob(topic)`：围绕一个主题跑**多步自主研究链**——跨多源搜集 → 交叉去重 → 用 `LlmProvider` 提炼概念 → 产出**成批且互相关联**的提议（`create` + `link`，必要时 `merge`/`archive`），全程写 `trace`。仍**只产提议**，落库走收件箱。

## 2. 非目标
- 不接管真实联网搜索引擎（先复用现有 `NewsSourceRegistry` + 主题过滤；外部检索作为后续 Provider 扩展）。
- 不自动确认任何提议。

## 3. 接口契约
```ts
// src/agent/jobs/topicResearchJob.ts
export interface ResearchConfig { maxSteps: number; tokenBudgetPerRun: number; maxProposals: number; }
export function createTopicResearchJob(topic: string, config?: Partial<ResearchConfig>): AgentJob;
```
运行链（每步入 trace，预算/步数双护栏）：
```
plan ← tools/llm.planResearch(topic, profile)        // B2
gather ← fetchNews + 主题过滤 + 现有图谱相关节点
synthesize ← llm.synthesizeConcepts(evidence[])      // B2 → 概念候选
propose ← 生成关联提议：create 新概念 + link 到既有/新建节点（+ 必要 merge/archive）
assemble ← AgentRunResult{ proposals(source=research_loop), digest=研究报告, trace }
```
关联完整性：同一批提议内部引用的新节点 id 用稳定临时 id，确认时按依赖顺序应用（create 先于 link）。

## 4. 验收清单
- [ ] 给定 topic + mock 源，产出 ≥2 个互相 `link` 的提议且依赖顺序正确。
- [ ] `source==="research_loop"`、全部 `pending`。
- [ ] 步数/预算任一超限优雅停止，trace 记录原因。
- [ ] 全程无存储写（沿用护栏断言）。
- [ ] abort 即停。

## 5. 测试（`topicResearchJob.test.ts`）
- 关联提议依赖排序；护栏截断；空证据；abort；与 A2 `approve` 批量确认后图谱一致。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 批量提议引用悬空 id | 确认时拓扑排序 + 校验；任一步失败回滚该批 |
| 多步放大成本 | maxSteps + tokenBudget 双护栏；mock 优先 |

## 7. DoD
`pnpm check` 全绿；`approve` 一批研究提议后星图出现连贯子图。
