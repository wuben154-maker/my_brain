---
name: spec-runner
description: >-
  Autonomously execute this repo's specs/ milestones in dependency order
  (parallel only when provably safe), each through a strict per-spec
  review-and-acceptance gate, looping until every spec is done. Use when the
  user asks to "run the specs", "execute the roadmap", "build everything per the
  plan", work through specs/README.md, or drive milestones to completion.
disable-model-invocation: true
---

# spec-runner — 自主执行 specs/ 直到全部完成（带逐 spec 审查验收）

把 `specs/README.md` 的路线图变成可自动推进的执行循环：按依赖顺序逐个（合理时并行）落地每个 spec，**每个 spec 完工都必须过一道独立审查验收闸门**，全绿才算数，循环到没有 `📝` 为止。本技能是 harness engineering 的执行器——**代码只是 spec 的机械翻译**。

## 不可逾越的护栏（每一步都成立）

- 必守 `.cursor/rules/` 全部规则：`spec-driven-execution`（先读 spec、复述契约、不越非目标）、`agent-no-write`、`provider-swappable`、`graph-mutation-confirm`、`storage-dual-target`、`memory-boundary`。
- 必守 `AGENTS.md` 7 条不变量 + `specs/README.md` 不变量表。
- **绿灯定义 = `pnpm check` 通过**（typecheck + lint + 不变量测试），且 stop hooks（`verify.mjs` + `memory-boundary.mjs`）无 followup。
- **不扩范围**：只做当前 spec 的「目标」，不顺手重构、不做其「非目标」。
- 不提交密钥；外部契约不杜撰（如 M0 的 EverMemOS REST 须先「前置确认」）。

## 真源（顺序与依赖从哪来）

1. **执行顺序**：`specs/README.md` 的「执行顺序速记」代码块——**排序权威**（含 N/G/M 系列与硬化项穿插时机）。
2. **状态与依赖**：每个 `specs/*.md` 头部的 `状态：`、`上游：`、`下游：` 字段。
3. **快速盘点还剩什么**：运行
   ```bash
   node .cursor/skills/spec-runner/scripts/spec-status.mjs
   ```
   它列出每个 spec 的 `状态 / 上游`，并统计 `done/total`。

> 「就绪集 ready-set」= 状态为 `📝` 且其「上游」全部已 `✅` 的 spec。

## 主循环（复制此清单并逐轮更新）

```
Runner Progress:
- [ ] 0. 读 specs/README.md 执行顺序 + 跑 spec-status.mjs，建依赖/状态视图
- [ ] 1. 算出当前「就绪集」；按执行顺序取下一个（或可并行子集，见“并行”）
- [ ] 2. 执行该 spec（见“单 spec 执行”）
- [ ] 3. 验证闸门：pnpm check 全绿
- [ ] 4. 审查验收闸门：独立 reviewer 子代理 PASS（见“审查验收”）
- [ ] 5. 提交 + 把该 spec 状态翻 ✅（README 索引 + spec 头部），附证据
- [ ] 6. 回到 1；当没有 📝 时进入“收尾”
```

每完成一个 spec，重新跑 `spec-status.mjs` 刷新视图，再选下一个。

## 单 spec 执行（严格按 spec-driven-execution 规则）

1. **完整读该 spec**；用一两句**复述其「验收清单 + 不变量 + 非目标」**，确认理解。
2. 若 spec 标注**前置确认/未决契约**（例：M0 的 EverMemOS REST 端点），**先完成确认并回填 spec**，否则停下问用户，不按猜测编码。
3. **严格按契约签名实现**：接口名/数据结构/迁移以 spec 为准；mock 实现优先、可在无外部服务下跑通；真实实现解析健壮、降级不抛。
4. 为改动补/改对应 `*.test.ts`（mock 优先，不依赖真实网络/API key）；涉及 Agent/记忆的补「无写能力 / 记忆边界」断言。

## 验证闸门

跑 `pnpm check`。红灯 → 修复 → 重跑，直到全绿。**不在红灯下推进**。

## 审查验收闸门（核心要求，绿灯后仍须独立过审）

`pnpm check` 绿后，**先自检再独立审查**：

1. **自检**：对照该 spec「验收清单」逐条贴证据（哪个测试/哪段代码/哪张截图满足该条）。
2. **独立 reviewer 子代理**（只读、不改码）——用 Task 工具：
   - `subagent_type: "generalPurpose"`，`readonly: true`，`run_in_background: false`。
   - 给它：当前 spec 路径、`git diff`（或变更文件清单）、要核对的规则清单。
   - 让它**只读核对**并给结论。提示骨架：
     > 你是独立验收 reviewer（只读）。对照 `specs/<X>.md` 的「验收清单/不变量/非目标」审查本次 `git diff`。逐条判定满足与否；并检查是否违反 `.cursor/rules/`（spec-driven-execution / agent-no-write / provider-swappable / graph-mutation-confirm / storage-dual-target / memory-boundary）与 `AGENTS.md` 不变量；检查是否越「非目标」范围或杜撰外部契约。**输出**：`VERDICT: PASS|FAIL` + 每条验收的判定 + 必修项列表（含文件:行）。不准修改任何文件。
3. **裁决**：
   - `FAIL` → 按必修项修复 → 重跑 `pnpm check` → 再次送审。**最多 3 轮**；仍 FAIL 则停下，向用户汇报阻塞点与已尝试。
   - `PASS` → 进入提交。

## 提交 + 标记完成

1. **Conventional Commits** 单 spec 一提交，例：`feat(agent): implement A4 inbox UI per specs/A4`。提交信息附「验收清单已逐条满足 + reviewer PASS」。
2. 把该 spec 状态从 `📝` 翻为 `✅`：改 `specs/README.md` 索引表对应行 **和** `specs/<X>.md` 头部 `状态：` 字段。
3. 仅提交本 spec 相关改动；不夹带无关变更。

## 并行执行（仅在可证明安全时）

默认**顺序**执行最稳。仅当就绪集中存在 **≥2 个互不依赖、且改动文件集不相交** 的 spec 时，才考虑并行：

- 用 Task 工具 `subagent_type: "best-of-n-runner"`（各自独立 git worktree/分支），一个子代理跑一个 spec，每个子代理同样遵循「单 spec 执行 + 验证闸门 + 自检」。
- **集成仍串行**：并行产物逐个合回主分支，每个合入前**再过一次本技能的审查验收闸门 + `pnpm check`**，绝不并行改同一批文件。
- 任一并行 spec 触碰共享文件（如 `StorageProvider`、`createAppProviders`、`uiStore`、`specs/README.md`）→ 退回顺序执行。
- 拿不准是否相交 → 顺序执行。

## 收尾（无 📝 时）

1. 再跑 `spec-status.mjs` 确认 `done == total`。
2. 跑一次完整 `pnpm check` 作总验。
3. 向用户汇报：已完成里程碑清单、每个的 reviewer 结论、未决/暂缓项（如 N3、需真连 sidecar 的 M0 本地验收）。

## 停止条件（必须停下并汇报，不要硬闯）

- 某 spec 连续 3 轮仍 `pnpm check` 红或 reviewer FAIL。
- 缺少对应 spec、或 spec 有未决外部契约且无法确认。
- 需要破坏性/不可逆操作，或会违反任一不变量/规则。
- 依赖循环或就绪集为空但仍有 `📝`（依赖未满足）。
