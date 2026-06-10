# KP-15 — Controlled Action Agent（`controlled-action`）

- **阶段：** KP Phase 8 · **状态：** planned
- **上游：** KP-14、KOS-E1 · **下游：** Phase 6–8 总 spec-verifier
- **依赖 / 前置里程碑：** KP-14 PASS；KOS-E1 draft-only 已实现
- **可并行性：** 无；最高风险自动化

## 定位

把行动层从 **draft-only** 扩展为 **受控执行**：仅低风险、可审计、可回滚的动作先开放。外部写必须 dry-run、用户确认、权限白名单、审计日志。**不破坏** KP-09 主闭环。

## 目标

1. Action permission model：`local_draft`、`local_file_write`、`external_write`、`destructive_action`。
2. 先开放低风险本地动作：本地 markdown 草稿、本地 task、非关键 docs 草稿；**`local_file_write` 限定输出目录白名单**（如 app data 下 `drafts/` 或等价沙箱目录）。
3. 外部写：dry-run preview → 用户确认 → 白名单 → audit log。
4. **禁止**默认：发文、建 GitHub issue、改代码、删数据。
5. UI：草稿 / 可执行 / 已执行 / 失败 / 可回滚 状态清晰。
6. Phase 6–8 完成后 `spec-verifier` 第二轮总验（trust boundary + action）。

## 非目标

- 不做无人值守 autonomous agent 循环。
- 不默认开启 external_write。
- 不让 action 绕过 KP-14 provisional 边界。
- 不做手机/cloud sync。

## 涉及文件/模块

```
src/domain/actions/actionPermission.ts
src/domain/actions/cognitiveAction.ts       # 扩展 KOS-E1
src/agent/actionExecutor.ts
src/agent/actionAuditLog.ts
src/components/actions/ActionDraftPanel.tsx
src/components/actions/ActionConfirmDialog.tsx
src/domain/actions/externalWriteRequiresConfirm.test.ts  # 新建（与 actionPermission.ts 同目录）
src/domain/actions/destructiveActionBlocked.test.ts
src/agent/actionAuditLog.test.ts                         # 新建（与 actionAuditLog.ts 同目录）
src/domain/actions/actionDryRunPreview.test.ts
```

## 用户可见流程或数据流

```
Weekly Review / Radar 产出 Action draft
  → UI 显示 risk level + permission + preview
  → local_draft：可保存本地文件（低风险）
  → external_write：dry-run → 用户确认 → 执行 → audit log
  → 失败：rollback 或 safe retry 指引
  → destructive：默认 disabled
```

## 验收清单

- [ ] 无用户确认 **不能** 执行 external_write（测试 FAIL if bypass）。
- [ ] destructive_action 默认不可用。
- [ ] 执行失败有 rollback 或 safe retry instruction。
- [ ] Action UI 五态清晰（草稿/可执行/已执行/失败/可回滚）。
- [ ] Draft-only 旧测试（KOS-E1）仍绿。
- [ ] audit log 记录 who/when/what/result。
- [ ] dry-run preview tests 绿。
- [ ] **`local_file_write` 沙箱**：仅允许白名单目录（如 app data `drafts/`）；路径越界视同 `external_write`，须 dry-run + 确认；`localWriteSandbox` 测试绿。
- [ ] KP-09 主闭环 E2E 回归绿（action 不破坏 Radar→Review 链）。
- [ ] **信任边界 UI**：design-review + qa 审权限、preview、确认流。
- [ ] Phase 6–8 完成后 spec-verifier 总验 PASS。

## 不变量与权限边界

- 外部写 **必须** dry-run + 用户确认 + 审计；无例外。
- **`local_file_write`** 仅允许白名单沙箱目录；路径越界 = `external_write` 级门控。
- 不得从 action 路径 silent write permanent graph（仍 ingest gate）。
- MCP 不获得 action execute 除非显式 future spec。
- Memory 不写图谱。

## 测试 / 验证命令

```bash
pnpm test -- externalWriteRequiresConfirm destructiveActionBlocked actionAuditLog actionDryRunPreview localWriteSandbox productInvariants companion showcaseCoreLoop
pnpm check
# Phase 6-8 spec-verifier 编排
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| 静默 external write | permission boundary tests block merge |
| UI 误导「已执行」 | 状态机 + qa |
| 破坏主闭环 | KP-09 E2E 必回归 |

**Stop condition：** action 无法提供 preview、审计或用户确认 → **不允许** 从 draft-only 升级为执行。

## Skill 使用要求

- **必须（信任边界）：** `design-review` + `qa` 重点审权限、preview、确认流。
- **Phase 6–8 完成后：** `spec-verifier` 第二轮高风险总验。

---

## Harness 验收协议

### Scope

- **做：** permission model、local low-risk execute、external dry-run+confirm+audit、UI 状态、KP-09 回归。
- **不做：** 默认 external publish、destructive enable、无 audit execute。

### Input fixtures

- KOS-E1 draft actions
- Mock external API adapter（dry-run only in test）

### User actions

1. 打开 Action draft → 见 preview + risk。
2. 尝试 external_write 无 confirm →  blocked。
3. confirm + dry-run → execute → audit log 有 entry。
4. 跑 `src/e2e/companion.e2e.test.ts` 主路径回归。

### Expected observations

| 观测 | 期望 |
|------|------|
| 无 confirm | external 不执行 |
| destructive | disabled |
| audit | 有记录 |
| 主闭环 | 仍 PASS |

### Assertions

```text
Given external_write action
When user has not confirmed
Then execute returns blocked
And audit log no success entry
When destructive_action requested
Then default denied
When local_draft allowed action
Then may execute with audit
When local_file_write targets path outside whitelist sandbox
Then blocked same as external_write (dry-run + confirm required)
And companion E2E (`src/e2e/companion.e2e.test.ts`) still passes
```

### Forbidden behaviors

- `local_file_write` 覆盖用户任意路径（非白名单沙箱）。
- 默认发布文章 / 创建 GitHub issue / 改 repo / 删数据。
- external write 无 dry-run。
- action execute 写 permanent graph bypass ingest。

### Failure recovery

| 失败 | 行为 |
|------|------|
| execute 失败 | rollback doc + audit failure + UI 可回滚态 |
| audit 写失败 |  abort execute（fail closed） |

### Verification command

```bash
pnpm test -- externalWriteRequiresConfirm destructiveActionBlocked actionAuditLog actionDryRunPreview localWriteSandbox productInvariants companion showcaseCoreLoop
pnpm check
```
