# A2 — 提议收件箱（`proposal-inbox`）

- **阶段：** A · **状态：** ✅ 已实现（`src/storage/proposalPersistence.ts`、`proposalStore.ts`、双适配器 + `proposalStore.test.ts` / `sqlitePersistence.test.ts`）
- **上游：** A1（产 `ProposalEnvelope`）、`AGENT.md §5` · **下游：** A3（写入）、A4（展示+确认）

## 1. 目标
把 A1 产出的 `ProposalEnvelope` **持久化**，并提供「列出待确认 / 改状态」能力；用户确认时**复用现有** `applyGraphMutation` + `persistGraphSnapshot` 落库，做到**零新增落库逻辑、零绕过**。这是「先建议后确认」从实时扩展到异步的载体。

## 2. 非目标
- 不做 UI（A4）。
- 不做调度（A5）。
- 不改变 `applyGraphMutation` 的任何行为。

## 3. 数据迁移（`src/storage/migrations.ts` 追加）
```sql
CREATE TABLE IF NOT EXISTS agent_proposals (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  kind        TEXT NOT NULL,          -- merge|archive|link|create|attach|update
  summary     TEXT NOT NULL,
  payload     TEXT NOT NULL,          -- JSON.stringify(GraphMutationProposal.payload)
  source      TEXT NOT NULL,          -- ProposalSource
  status      TEXT NOT NULL DEFAULT 'pending'  -- ProposalStatus
);
CREATE INDEX IF NOT EXISTS idx_agent_proposals_status ON agent_proposals(status);
```
> 迁移需在 better-sqlite3（`webSqlStorage`/`betterSqliteBackend`）与 Tauri SQL（`tauriSqlStorage`）**双实现**对齐。

## 4. 接口契约（`StorageProvider` 扩展，向后兼容）
```ts
// src/storage/types.ts 追加
listPendingProposals(): Promise<ProposalEnvelope[]>;     // status='pending'，按 created_at 升序
saveProposal(p: ProposalEnvelope): Promise<void>;        // upsert by id；payload 经 read*Payload 校验后再存
setProposalStatus(id: string, status: ProposalStatus): Promise<void>;
```
```ts
// src/stores/proposalStore.ts（新增，zustand）
interface ProposalState {
  pending: ProposalEnvelope[];
  load(storage): Promise<void>;
  approve(storage, graphStorage, id): Promise<void>;     // 取 proposal → applyGraphMutation → persistGraphSnapshot → setStatus('approved')
  reject(storage, id): Promise<void>;                    // setStatus('rejected')
}
```
确认落库严格走：
```
proposal → applyGraphMutation(snapshot, proposal) → persistGraphSnapshot(storage, before, after)
        → graphStore.setGraph(after) → setProposalStatus(id,'approved')
```

## 5. 验收清单
- [x] migration 在两套适配器都建表成功，重复运行幂等。
- [x] `saveProposal`/`listPendingProposals`/`setProposalStatus` 往返一致（含 payload JSON round-trip）。
- [x] payload 入库前用对应 `read*Payload`（`graphMutationPayloads.ts`）校验，非法直接拒绝。
- [x] `approve` 产出的快照 **=== 手动 `applyGraphMutation` 路径**（行为零分叉）。
- [x] `approve`/`reject` 后该提议不再出现在 `listPendingProposals`。
- [x] 无任何路径让 Agent 直接写 `agent_proposals` 以外的图谱表（写仍只经 `persistGraphSnapshot`）。

## 6. 测试用例（`sqlitePersistence.test.ts` / 新增 `proposalStore.test.ts`）
- 建表幂等、增删改查往返、非法 payload 拒绝、approve 一致性、过期占位（A 阶段仅留字段，清理在 A3/A5）。

## 7. 风险与对策
| 风险 | 对策 |
|---|---|
| 两套适配器行为漂移 | 共用同一组测试夹具（`testStorage.ts`）跑双实现 |
| 确认时图谱已被改动导致冲突 | approve 前重新 `loadGraph` 取最新 before；目标节点不存在则报错并标记 proposal 失效 |

## 8. DoD
`pnpm check` 全绿；A4 能直接 `load()` 出 pending 列表并 `approve/reject`。
