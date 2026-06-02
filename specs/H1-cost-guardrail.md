# H1 — 成本护栏（断言化）（`cost-guardrail`）

- **类型：** 硬化（Hardening）· **状态：** ✅ 已实现
- **执行时机：** **跟 A5 一起**（自主调度上线前必须焊死）；**B1 时加强**到多步
- **上游：** A3 的 `tokenBudgetPerRun`、A5 调度 · **下游：** B1 多步研究

## 1. 目标
把"token 预算"从 A3 的一个软参数，升级为**会失败的硬护栏**：单次运行超限即截断并记录，并新增**单日总量上限**。原则——在「Job 无人值守自动跑」（A5）真正花钱之前上锁。

## 2. 非目标
- 不接真实计费 API；以 `trace[].tokensUsed` 累计估算为准。
- 不改 A3 已有的 Job 业务逻辑，只加护栏与持久化。

## 3. 接口契约
```ts
// src/agent/budget.ts
export interface TokenBudget {
  charge(tokens: number): void;        // 累加；超单次上限抛 BudgetExceededError
  remaining(): number;
  spentToday(): number;
}
export class BudgetExceededError extends Error {}
export function createTokenBudget(input: {
  perRun: number;
  perDay: number;
  loadTodaySpent: () => number;        // 从本地读取当日已用（持久化见下）
  recordSpend: (tokens: number) => void;
}): TokenBudget;
```
- **单日上限持久化**：复用 `StorageProvider`（新增 `loadAgentUsage(date)` / `addAgentUsage(date, tokens)`，双适配器对齐；遵守 `storage-dual-target` 规则）。
- Job（`MorningBriefJob` 等）在每次 `summarize/propose` 后 `budget.charge(step.tokensUsed)`；超限则停止后续步骤、`trace` 记 `budget_truncated`，已产出的正常返回（**绝不**因省钱而绕过"先建议后确认"）。

## 4. 验收清单
- [x] 单次累计超 `perRun` → 截断，`trace` 含 `budget_truncated`，已得提议照常返回。
- [x] 当日累计超 `perDay` → 后续运行直接不调用 LLM（早退），记录原因。
- [x] 用量持久化在两套适配器一致（跨"今天"边界正确归零）。
- [x] **回归断言**：给定 mock 的每步 token，`sum(trace.tokensUsed) ≤ perRun`。
- [x] 护栏不引入任何存储写到图谱（沿用 Agent 无写护栏断言）。

## 5. 测试（`budget.test.ts` / job 集成）
- 单次/单日上限触发；跨日归零；截断后提议完整性；token 求和回归。

## 6. B1 加强项（执行 B1 时一并完成）
- 扩展为 **每步上限 + 总量上限 + maxSteps** 三重；多步研究链 token 求和回归测试。

## 7. 风险与对策
| 风险 | 对策 |
|---|---|
| 估算 token 不准 | 以保守上限 + trace 透明；真实计费留后续 |
| 截断破坏数据完整性 | 截断只停"后续步骤"，已生成提议保持有效；确认通道不变 |

## 8. DoD
A5 自动调度开启时，单次/单日预算超限有**会失败的测试**兜底；烧钱风险被锁死。
