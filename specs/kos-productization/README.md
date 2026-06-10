# KOS Productization（KP 系列 · planned）

> 来源：[`docs/KOS_PRODUCTIZATION_PLAN.md`](../../docs/KOS_PRODUCTIZATION_PLAN.md)  
> 目标：把已实现的 KOS A–F harness 能力收束为 **可信主闭环产品体验**（Radar → 语音入库 → 自动整理 → Weekly Review），再按风险顺序进入 Controlled Autonomy（schema 扩展、provisional ingest、controlled action）。

## 与平铺 KOS/V 系列的关系

- **不移动** 已有 `specs/KOS-*.md`、`specs/V*.md` 等平铺 spec；历史链接保持有效。
- KP 系列是 **产品化执行层**：在 KOS-B3（daily-briefing）、KOS-D3（weekly-brain-review）等已实现 harness 之上，定义 **默认入口、UI contract、主路径 E2E、H5-storage-transactions gate、总验收门**。
- 实现 KP 时 **复用** 已有 domain/store/test，不重写 ranking/ingest/curation 内核。
- **成熟度文档**（KP-06）：[`docs/evals/README.md`](../../docs/evals/README.md) — 区分 **default / harness-backed / experimental**；spec ✅ ≠ default 已交付。

## 成熟度口径（KP-06）

| 标签 | 含义 |
|------|------|
| **default** | 无 flag 正常启动主路径（Radar mock-first top 3 → V3 ingest → V4 curation/undo） |
| **harness-backed** | Vitest/regression 覆盖；UI 或 live API 可能 partial（Weekly Review、profile loop、Action drafts） |
| **experimental** | `?showcase=1`、RSS flatten legacy fallback、Phase 6–8、KP-15 受控外部写 |

## 默认体验裁定（全系列硬约束）

| 路径 | 触发 | 定位 |
|------|------|------|
| **Radar 默认** | 无 query flag / 正常启动 | 主体验：mock-first briefing；真实 source 成功则增强，失败则 fallback |
| **Showcase 演示** | `?showcase=1` | 固定 curated 演示流；面试/截图专用 |
| **RSS flatten legacy** | 内部 fallback | 降级/遗留；**不是**主体验入口 |

## 对蓝图的显式裁剪清单

相对 [`docs/KNOWLEDGE_OS_VISION.md`](../../docs/KNOWLEDGE_OS_VISION.md)，本执行方案显式推迟（详见 [`docs/KOS_PRODUCTIZATION_PLAN.md`](../../docs/KOS_PRODUCTIZATION_PLAN.md) 同名章节）：

- **Interview Mode（KOS-C3）**：先收束 Radar → 入库 → 整理 → Review 主闭环；**KP-09 PASS** 后作为 Phase 5.5 或 Phase 6 并行候选评估。
- **LearningTrace / 复习提醒（KOS-C1）**：同上回归条件。

## Spec 索引

> **Phase 编号 ≠ 执行顺序**（例如 Phase 3 Weekly Review 先于 Phase 2 Feedback 执行）。「执行序号」列才是推荐落地顺序。

| 执行序号 | Spec | 代号 | Phase | 依赖 | 状态 | 一句话 |
|----------|------|------|-------|------|------|--------|
| 1 | [KP-00-ui-contract](./KP-00-ui-contract.md) | `ui-contract` | 0 | V0–V7 | planned | v2 主界面 IA：星图 + 光球 + companion shell；阻塞 Phase 1+ |
| 2 | [KP-01-default-radar-launch](./KP-01-default-radar-launch.md) | `default-radar-launch` | 1 | KP-00, KOS-B3 | planned | 无 flag 默认 Radar top3；live source + ranking golden |
| 3 | [KP-02-radar-companion-ui](./KP-02-radar-companion-ui.md) | `radar-companion-ui` | 1 | KP-00, KP-01 | planned | RadarSignal 进 v2 companion card，非 legacy NewsCard |
| 4 | [KP-03-weekly-review-mainflow](./KP-03-weekly-review-mainflow.md) | `weekly-review-mainflow` | 3 | KP-00, KOS-D3 | planned | Weekly Review 主路径入口；绑定 graph history |
| 5 | [KP-04-feedback-persistence](./KP-04-feedback-persistence.md) | `feedback-persistence` | 2 | KP-01, KOS-B3 | planned | feedback 持久化并影响下一轮 ranking |
| 6 | [KP-05-profile-teaching-loop](./KP-05-profile-teaching-loop.md) | `profile-teaching-loop` | 2 | KP-04, KOS-C2 | planned | 画像修正 + teaching depth 可见闭环 |
| 7 | [KP-06-evals-docs](./KP-06-evals-docs.md) | `evals-docs` | 4 | KP-01–05 | planned | [`docs/evals/`](../../docs/evals/README.md) + 成熟度/默认体验文档口径 |
| 8 | [KP-07-storage-transaction-gate](./KP-07-storage-transaction-gate.md) | `storage-transaction-gate` | 4.5 | H5 债务；可与 KP-06 并行 | planned | graph+history 原子性 + 迁移框架；**阻塞 KP-08** |
| 9 | [KP-08-project-node-minimal](./KP-08-project-node-minimal.md) | `project-node-minimal` | 5 | KP-07, KOS-E2 | planned | 最小 `Project` 节点；Phase 6 不重复 |
| 10 | [KP-09-phase-1-5-acceptance-gate](./KP-09-phase-1-5-acceptance-gate.md) | `phase-1-5-gate` | gate | KP-00–08 | planned | 主路径 E2E + dogfood 质量 + 边界；PASS 才进 Phase 6–8 |
| 11 | [KP-10-source-node](./KP-10-source-node.md) | `source-node` | 6.1 | KP-09 | planned | `Source` 一等对象；provenance 增强 |
| 12 | [KP-11-decision-node](./KP-11-decision-node.md) | `decision-node` | 6.2 | KP-10 | planned | `Decision` 项目取舍记录 |
| 13 | [KP-12-question-node](./KP-12-question-node.md) | `question-node` | 6.3 | KP-11 | planned | `Question` 学习盲点 |
| 14 | [KP-13-skill-node](./KP-13-skill-node.md) | `skill-node` | 6.4 | KP-12 | planned | `Skill` 能力成长 |
| 15 | [KP-14-provisional-ai-ingest](./KP-14-provisional-ai-ingest.md) | `provisional-ingest` | 7 | KP-13 | planned | AI 候选隔离区；晋升仅用户确认 |
| 16 | [KP-15-controlled-action-agent](./KP-15-controlled-action-agent.md) | `controlled-action` | 8 | KP-14, KOS-E1 | planned | 受控执行；`local_file_write` 沙箱 + 外部写须确认 |

## 执行顺序（推荐）

```
KP-00（第一步，阻塞后续）
  → KP-01 → KP-02
  → KP-03
  → KP-04 → KP-05
  → KP-06
  → KP-07（H5 gate，可与 KP-06 并行；阻塞 KP-08）
  → KP-08
  → KP-09（总验收门；FAIL 则停止 Phase 6–8）
  → KP-10 → KP-11 → KP-12 → KP-13（Phase 6，每种类型单独落地）
  → KP-14 → KP-15
```

## 并行性速记

| 可并行 | 前提 |
|--------|------|
| KP-02 与 KP-01 后半 | KP-00 PASS；launch 路径与 UI shell 可分工 |
| KP-04 与 KP-03 | KP-04 依赖 KP-01（briefing 数据）；KP-03 依赖 KP-00；Review 主路径与 feedback store 可并行 |
| KP-06 与 KP-05 收尾 | 文档/evals 可在 feedback 落地后穿插 |
| KP-07 与 KP-06 | KP-07 可与 KP-06 并行启动；KP-09 验收需 KP-06 文档口径一致 |
| KP-10–13 | **不可**并行；Phase 6 每次只扩一种节点类型 |

## 总验收门

- **KP-09** 是唯一 Phase 1–5 总 gate：默认 E2E（Radar top3 → RadarSignal → 语音入库 → auto-curate → undo → Weekly Review）+ showcase E2E + 边界（WorldItem 不写图谱、MCP 只读、Action draft-only、Memory 不写图谱）+ **dogfood 质量**（连续 ≥3 天，每天 top3 至少 1 条有用/愿入库）+ H5 gate PASS + live source smoke 证据 + 验证测试文件存在性 + 文档口径一致。
- **KP-09 FAIL**：停止 KP-10–15；不得用 schema 扩展或自动化掩盖主闭环缺陷。
- **Phase 6–8 完成后**：再用 `spec-verifier` 做第二轮高风险总验（trust boundary UI + provisional/action 边界）。

## Skill 使用总表

| 阶段 | 规划期 | 落地后 |
|------|--------|--------|
| KP-00, KP-01, KP-03 | 必须 `/plan-design-review` | `design-review` + `qa` 或 companion visual smoke |
| KP-02, KP-05, KP-08, KP-10–15（有 UI） | 视改动 `/plan-design-review` | `design-review` + `qa` |
| KP-04（仅 store） | — | 无 UI 则 storage/integration test |
| KP-06, KP-07 | — | docs/storage tests · [`docs/evals/README.md`](../../docs/evals/README.md) |
| KP-09 | — | `spec-verifier` + `spec-acceptance-review` |
| KP-14, KP-15 | 信任边界 UI | **必须**重点 `design-review` + `qa` |

## 验证命令约定

各 KP spec「测试 / 验证命令」中的测试名在验收时必须满足：

1. **对应实际存在的测试文件**，且文件内包含 spec 声明的断言（非仅文件名匹配）。
2. Vitest 按名称过滤时 **无匹配 = FAIL**（不得静默通过）；CI/本地须保证 `passWithNoTests: false` 或等价约束。
3. **KP-09** 总 gate 须逐一核对 KP-00–08 所列验证测试文件路径真实存在。

## 仍不建议跳过的护栏

- 不做手机端、云同步、多用户、复杂插件市场。
- 不跳过 KP-00 与 KP-09。
- 不跳过 KP-07 就扩 schema（KP-08+）。
- 不让 AI 候选绕过隔离区直写永久图谱（KP-14）。
- 不让外部写动作绕过 dry-run、用户确认、审计（KP-15）。
- 不把 legacy RSS flatten 或 showcase 写成默认主体验。
