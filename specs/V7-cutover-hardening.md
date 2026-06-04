# V7 — v2 切换、清理与接真验收（`cutover-hardening`）

- **阶段：** V 收尾 · **状态：** 📝 待实现
- **上游：** V0–V6 · **下游：** —
- **复用：** V0–V6 全部交付物；legacy `agent/`、`storage`、`providers` 等底座
- **依赖 / 前置里程碑：** **V0–V6** 功能闭环
- **可并行性：** 无；必须最后执行

## 1. 目标
完成 v2 **主流程切换**：清理死 UI 与测试；端到端 **mock 冒烟** `companion.e2e`；保证 **`pnpm check` 全绿**、**H0 覆盖率不降**；产出 **「接真 API key 验收清单」**；同步文档 **`PRODUCT.md`（若漂移）**、**`specs/README.md`**、**`docs/PROJECT_STATUS.md`**（架构真源引用 **`AGENTS.md`**，仓库无 `AGENT.md`）。

## 2. 非目标
- 不在本里程碑默认接入生产 key（仅清单与切换开关文档化）。
- 不实现 H5 存储事务（已知债务，可单列后续）。
- 不恢复多分区导航为主流程。
- **不删除、不迁移** `agent_proposals` 表（见 §4）。

## 3. 契约
```
删除或移出主流程（至少不渲染、不测默认 e2e）：
  src/components/layout/NavRail.tsx
  src/components/layout/TopBar.tsx
  src/components/layout/MainSectionContent.tsx
  src/components/explore/* 主入口
  src/components/inbox/* 主入口（ProposalInbox）
  src/components/docs/*、mindmap/*、insight/* 分区主入口
  相关 navSections "planned/live" 测试改为已下线或删除

保留（复用 / legacy）：
  agent/（curation 改 autoCurate）、storage、providers、eval/
  agent_proposals 表 → 只读 legacy 归档（见 §4）

src/hooks/useAgentScheduler.ts（或等价）
  // v2 定稿：注销 A3 morningBriefJob、C2 curationScanJob（及任何 saveProposal pending 的 job）
  // 保留：仅资讯抓取若仍经独立 job，则改为只写 newsQueue（与 V1 loading 一致，不产提议）

src/e2e/companion.e2e.ts
  场景：boot → self_check → loading → companion
        → 冷启动首星（可选短路径 mock）→ 闲聊 → briefing → 入库「入」→ autoCurate history
        → 串讲高亮 → 设置改音色

docs/V2_REAL_API_ACCEPTANCE.md   // 接真清单（本 spec 产出物）

视觉 CI（定稿）：
  退役 ?visual=main 门禁与 assets/*main* 基线（V6 已引入 companion 轨）
  H2 visual-smoke 默认跑 companion 帧
```

### 接真 API key 验收清单（纲要，展开为 `docs/V2_REAL_API_ACCEPTANCE.md`）
| 区域 | Mock 点位 | 切真方式 | 验收用例 |
|---|---|---|---|
| 语音 | `MockVoiceProvider` | `VITE_VOICE_PROVIDER=openai-realtime` + key | `speak`/`setVoice`；barge-in；自检播报 |
| LLM | `MockLlmProvider` | `VITE_LLM_PROVIDER=openai` | 资讯讲解、蒸馏、persona |
| 资讯 | mock news | 真实 RSS/GitHub fetch | loading 填 `newsQueue` → briefing |
| 记忆 | mock memory | EverMemOS sidecar | recall 注入不写图谱 |
| 入库 | `parseIngestCommand` | 真实 STT | 三口令 + reprompt→二次 skip |
| 整理 | `autoCurate` | 同逻辑 | 入库后 merge + `graphHistory` undo |

## 4. 数据结构 / legacy（定稿）
- **`agent_proposals` 表：保留，只读 legacy 归档**。不删表、不做 schema 迁移、不批量清空。新整理只写 `graph_history`（V4）。UI 与 `proposalStore.approve` **不得**出现在 v2 主流程；历史行仅供审计/调试只读查询（若有工具页须标 legacy）。
- `navSections.ts`：删除或 `v2-removed` 注释；`uiStore` 去 `activeSection` 主路径依赖。

## 5. 验收清单
- [ ] 主应用无 NavRail/Explore/Docs/Mindmap/ProposalInbox/Insight 默认入口。
- [ ] **无任何静默提议**：scheduler 未注册 A3/C2 产提议 job；运行期无 `saveProposal(..., pending)`（扫描 + 测试）。
- [ ] `companion.e2e` 在 CI mock 环境绿。
- [ ] `pnpm check` + `pnpm coverage` 满足 H0 下限。
- [ ] `productInvariants.test.ts` 反映 v2：ingest 需确认、post-ingest 可自动、记忆不写图谱。
- [ ] `docs/V2_REAL_API_ACCEPTANCE.md` 已提交；引用 **`AGENTS.md`**（非 AGENT.md）。
- [ ] `specs/README.md`、`docs/PROJECT_STATUS.md` 与 v2/V 系列一致。
- [ ] visual CI：**已退役 `?visual=main`**；`companion` 为唯一像素回归轨。

## 6. 涉及不变量
- 全量 v2 三条决策 + **`AGENTS.md`** 现行版。
- 删除=归档；可打断语音；本地优先。

## 7. 测试（harness）
- `companion.e2e.ts`（新）
- 删除/改写：`navSections.test.ts`、`MainSectionContent.test.ts` 等
- `agentScheduler.test.ts`（或等价）：断言 **未**注册 A3/C2 产提议 job
- H0 coverage 无降

## 8. 风险与对策
| 风险 | 对策 |
|---|---|
| 删组件破坏旧快照 | V7 已退役 main；仅 companion 基线 |
| OpenAI 路径 H4 债务 | 接真清单标红；CI 默认 mock |
| 误删 agent_proposals | 只读 legacy，代码层禁止主流程 approve |

## 9. DoD
`pnpm check` 全绿；`companion.e2e` 绿；文档同步 **`AGENTS.md`** 口径；接真清单评审通过；H0 不降；**无静默提议**断言绿。
