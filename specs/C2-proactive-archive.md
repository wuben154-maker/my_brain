# C2 — 主动净化建议（`proactive-archive`）

- **阶段：** C · **状态：** 📝 待做
- **上游：** A2（收件箱）、现有 `graphMutations`（`archive` + 边迁移）· **下游：** C3

## 1. 目标
定期扫描图谱，对「可能过时 / 有更优解 / 长期不被触达」的概念节点，生成 `archive` 提议（带 `migrateEdgesToNodeId` 实现边迁移）进收件箱——**主动提议，绝不自动归档**。这是不变量 #2/#4 在自主场景的体现。

## 2. 非目标
- **绝不**自动执行归档（必须经用户确认）。
- 不做硬删除（删除=归档）。

## 3. 接口契约
```ts
// src/agent/jobs/curationScanJob.ts
export interface CurationScanConfig { staleDays: number; maxProposals: number; }
export function createCurationScanJob(config?: Partial<CurationScanConfig>): AgentJob;
```
扫描启发式（纯函数 `src/agent/curation/detectStale.ts`，可单测）：
```ts
export interface StaleFinding { nodeId: string; reason: string; migrateToNodeId?: string; }
export function detectStaleNodes(graph: BrainGraphSnapshot, now: Date, staleDays: number): StaleFinding[];
// 信号：updatedAt 久未更新；被新节点 replaces（RelationType "replaces"）指向；与某节点高度重叠
```
- 命中项 → 生成 `kind:"archive"` 提议，payload 经 `readArchivePayload` 校验；若有更优解则带 `migrateEdgesToNodeId`（复用 `migrateEdges`）。
- `source:"profile_suggestion"`、`status:"pending"`。

## 4. 验收清单
- [ ] `detectStaleNodes` 表驱动：久未更新 / 被 `replaces` 指向 / 高重叠 各命中正确。
- [ ] 生成的 `archive` 提议确认后，边正确迁移到 `migrateEdgesToNodeId`（复用并对齐 `graphMutations.test.ts`）。
- [ ] **无任何自动归档路径**：本 Job 不调用 `persistGraphSnapshot`（护栏断言）。
- [ ] `maxProposals` 截断；无候选时产出空。

## 5. 测试（`detectStale.test.ts` / `curationScanJob.test.ts`）
- 启发式命中矩阵；archive+边迁移一致性；无写能力断言。

## 6. 风险与对策
| 风险 | 对策 |
|---|---|
| 误判归档有用知识 | 仅建议；归档=可找回；`reason` 透明；用户拒绝反哺 C3 |
| 边迁移目标非法 | 复用 `applyGraphMutation` 既有校验（目标不存在/同身/已归档即报错） |

## 7. DoD
`pnpm check` 全绿；扫描产出可确认的归档建议，确认后边无断裂。
