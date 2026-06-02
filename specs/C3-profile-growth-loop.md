# C3 — 画像生长闭环（`profile-growth`）

- **阶段：** C · **状态：** 📝 待做
- **上游：** 现有 `distillUserProfile`、C1（打分）、C2（建议）· **下游：** 反哺 A3/C1/C2，形成飞轮

## 1. 目标
补全「越用越懂你」的闭环：除了已有的「语音会话结束 `distillUserProfile`」，再让 **Agent 运行结果 + 用户对提议的接受/拒绝**也反哺用户画像权重（如连续拒绝某方向 → 降低该方向选题权重）。

## 2. 非目标
- 不改三层记忆边界（仍只存画像文字，不存原文/音频）。
- 不引入新的存储后端。

## 3. 接口契约
```ts
// src/agent/profile/feedbackSignals.ts（纯函数）
export interface ProposalFeedback { source: ProposalSource; kind: GraphMutationProposal["kind"]; status: "approved" | "rejected"; topicHint?: string; }
export function applyProposalFeedback(profile: UserProfile, feedback: ProposalFeedback[]): UserProfile;
// approved 强化相关 interests；rejected 降权 / 移出 interests；更新 updatedAt
```
- 接入点：A2 `proposalStore.approve/reject` 时收集 feedback；批量调用 `applyProposalFeedback` → `saveUserProfile`。
- 与现有 `distillUserProfile` 合流：两条来源都只**追加/调整**画像，不互相覆盖（合并策略可单测）。

## 4. 验收清单
- [ ] 连续 `rejected` 某方向 → 该方向在 C1 打分中权重下降（可观测、可断言）。
- [ ] `approved` 强化相关兴趣。
- [ ] 反哺只改画像层，不触碰图谱/原文（护栏断言）。
- [ ] 与 `distillUserProfile` 合并不产生字段丢失/震荡（幂等/收敛测试）。

## 5. 测试（`feedbackSignals.test.ts`）
- 接受/拒绝对权重的影响；与 distill 合并；幂等；空反馈不变。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 反哺过激导致兴趣漂移 | 权重平滑（指数衰减/上下限）；保留探索位（呼应 C1） |
| 画像无限膨胀 | 列表去重 + 容量上限 + 旧信号衰减 |

## 7. DoD
`pnpm check` 全绿；端到端可观测「拒绝某类提议 → 后续该类选题减少」的飞轮效应。
