# A5 — 本机调度（`local-scheduler`，L1）

- **阶段：** A · **状态：** ✅ 已实现
- **上游：** A3（`MorningBriefJob`）、A2（写收件箱）· **下游：** B 阶段 Job 复用同一调度器

## 1. 目标
让 `MorningBriefJob` 在应用运行/空闲时**定时自动触发**（运行环境档位 L1，零成本），结果写入收件箱；用户可在设置里开关与设频率，且运行可中断。调度器与内核解耦——同一个 `AgentJob` 将来也能挪到 L2（GitHub Actions）跑。

## 2. 非目标
- 不实现 L2/L3（Serverless/VPS）；但接口要为其留位（统一 `AgentRunResult` schema）。
- 不做跨设备同步。

## 3. 接口契约
```ts
// src/agent/scheduler.ts
export interface SchedulerConfig {
  enabled: boolean;
  intervalMs: number;          // 如每 6h
  jobId: string;               // 'morning-brief'
}
export interface AgentScheduler {
  start(): void; stop(): void;
  triggerNow(): Promise<AgentRunResult>;   // 手动「立即抓」
  onRun(listener: (r: AgentRunResult) => void): () => void;
}
export function createAgentScheduler(deps: {
  job: AgentJob; tools: AgentTools;
  persist: (r: AgentRunResult) => Promise<void>;   // = 写收件箱(A2.saveProposal 批量)
  config: SchedulerConfig;
}): AgentScheduler;
```
- 运行锁：同一时刻同一 jobId 只跑一个（仿 `runLaunchSequence` 的 `launchStarted` 守卫 / `AbortController`）。
- 触发后 `persist` 把 `result.proposals` 批量 `saveProposal`，并清理 `expired`。
- 设置项持久化到本地（profile 或单独 settings 表）。

## 4. 验收清单
- [x] `enabled=true` 到点自动跑并写收件箱；`enabled=false` 不触发。（`scheduler.test.ts` 假定时器）
- [x] `triggerNow()` 手动立即跑，结果进收件箱。（`scheduler.triggerNow` + `persistAgentRunResult`）
- [x] 运行中再次触发被运行锁拒绝（不并发）。（`SchedulerBusyError`）
- [x] `stop()` 能中断进行中的 run（`AbortSignal` 生效）。（`scheduler.test.ts`）
- [x] pending 超期被标 `expired` 不再展示。（`schedulerPersist` + 集成测试）

## 5. 测试（`scheduler.test.ts`，假定时器）
- `vi.useFakeTimers` 驱动间隔触发；运行锁；abort；persist 被调用且参数正确。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 电脑关机抓不到（产品已知） | L1 局限写进文档；后续 L2 GitHub Actions cron 补足 |
| 定时器在后台被节流 | 触发后校验时间戳补跑；记录 lastRunAt |

## 7. DoD
`pnpm check` 全绿；关闭开关零触发、开启后能自动产出可确认的提议。
