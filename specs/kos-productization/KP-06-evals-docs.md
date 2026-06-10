# KP-06 — 评测与文档口径（`evals-docs`）

- **阶段：** KP Phase 4 · **状态：** planned
- **上游：** KP-01–05（能力已落地或可描述） · **下游：** KP-07、KP-09
- **依赖 / 前置里程碑：** 主路径能力有对应 test；可与实现收尾并行
- **可并行性：** 可与 KP-05 收尾并行；**不阻塞 KP-07 启动**但 KP-09 需文档一致

## 定位

避免「spec 全 ✅ = 产品已成熟」误读。建立 `docs/evals/`，同步 README、ARCHITECTURE、PROJECT_STATUS、specs/README 的 **成熟度口径** 与 **默认体验裁定**。

## 目标

1. 新增 `docs/evals/` 五类说明：Radar relevance、Ingest quality、Curation undo、Profile growth、Action usefulness。
2. 每类对应 **验证命令**（指向现有 test 或 harness）。
3. 更新 `docs/ARCHITECTURE.md`、`docs/PROJECT_STATUS.md`、`specs/README.md`：区分 default / harness-backed / experimental。
4. README **只承诺**默认可体验能力；隐藏能力标 experimental。
5. 统一三条路径文案：**Radar 默认** / `?showcase=1` / legacy RSS flatten fallback。

## 非目标

- 不实现新 ranking 算法（复用 KOS-B2 tests）。
- 不做 UI 改造（KP-00–03 负责）。
- 不修复 H5-storage-transactions 债务（KP-07）。
- 不在本 spec 接真 API 全量验收（仍指 V7 清单）。

## 涉及文件/模块

```
docs/evals/README.md
docs/evals/radar-relevance.md
docs/evals/ingest-quality.md
docs/evals/curation-undo.md
docs/evals/profile-growth.md
docs/evals/action-usefulness.md
docs/ARCHITECTURE.md
docs/PROJECT_STATUS.md
README.md                                   # 仓库根
specs/README.md
src/docs/docsSurface.test.ts                # 链接/关键词测试（现有）
```

## 用户可见流程或数据流

```
访客读 README → 知默认 Radar 主路径
  → ARCHITECTURE 知 harness vs product
  → evals/ 知如何复跑验证
  → 面试官不被「全 ✅ spec」误导为成熟 OS
```

## 验收清单

- [ ] `docs/evals/` 存在且五类均有验证命令引用。
- [ ] README/ARCHITECTURE/PROJECT_STATUS **无冲突**描述默认入口。
- [ ] 默认体验裁定三路径在 ≥3 文档中一致。
- [ ] specs/README KP 索引与 evals 交叉链接。
- [ ] docs surface test（链接/关键词）通过或 checklist 人工 sign-off。
- [ ] 每个 **默认主路径** 能力（Radar、ingest、auto-curate、Review）有命令可复查。

## 不变量与权限边界

- 文档不得承诺未实现的默认能力。
- 不得把 MCP 写能力、action 执行写进默认承诺。
- legacy flatten 不得写为默认。

## 测试 / 验证命令

```bash
pnpm test -- docsSurface docsLinks keywords
pnpm check
# 人工：新 agent 读 README 能否答对默认路径
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| evals 与 test 脱节 | 每 eval 页必须 pnpm test 命令 |
| 文档 drift | docs surface CI |

**Stop condition：** 成熟度口径仍冲突 → KP-09 文档验收 FAIL，不得 PASS gate。

## Skill 使用要求

- **不需要** design-review；docs/evals tests + 人工 review checklist。

---

## Harness 验收协议

### Scope

- **做：** evals 目录、成熟度口径、默认体验裁定、验证命令索引。
- **不做：** 功能实现、storage transaction。

### Input fixtures

- 当前 `pnpm test` 可运行列表
- KP-01–05 已合并能力清单

### User actions

1. 打开 `docs/evals/radar-relevance.md`，运行所列命令。
2. 对照 README 默认路径描述与 KP-01 spec。
3. grep 全 repo「默认」与「showcase」表述。

### Expected observations

| 观测 | 期望 |
|------|------|
| evals | 5 文件 + 命令 |
| README | Radar 默认，非 flatten |
| conflict | 无 ARCHITECTURE vs README 矛盾 |

### Assertions

```text
Given docs/evals merged
When docs surface test runs
Then all eval pages link to existing test commands
And README states default is Radar mock-first without flag
And legacy flatten labeled fallback only
```

### Forbidden behaviors

- README 写 legacy flatten 为默认。
- evals 页无验证命令。
- 宣称 Phase 6–8 能力为默认已交付（未 PASS KP-09）。

### Failure recovery

| 失败 | 行为 |
|------|------|
| 链接 404 | 修链或标 planned |
| 口径冲突 | 以 AGENTS.md + KP README 为准统一 |

### Verification command

```bash
pnpm test -- docsSurface
pnpm check
```
