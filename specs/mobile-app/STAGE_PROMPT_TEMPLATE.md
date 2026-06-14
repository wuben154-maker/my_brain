# M 阶段父子 Agent 任务模板

> **用途**：父 agent 每次派发 composer2.5 子 agent 时复制本模板。  
> **硬规则**：一次只派发一个 M 阶段。未通过 `M{n}-GATE` 前，不得让子 agent 处理 `M{n+1}` 范围。

---

## 父 Agent 派发前检查

```text
1. 读取 docs/MOBILE_PRODUCT_PLAN.md
2. 读取 specs/mobile-app/EXECUTION_GUARDRAILS.md
3. 读取 specs/mobile-app/GATE_VERIFIER_SPEC.md
4. 读取 specs/mobile-app/M{n}-*.md
5. 若 n > 0，读取 specs/mobile-app/reports/M{n-1}-GATE-report.md
6. 读取 specs/mobile-app/EXECUTION_STATE.json（M0 创建后）
7. 确认 allowedNextAction 匹配当前阶段：
   - M0–M6：`run_M{n}_only`
   - M7A：`run_M7A_only`（上一阶段 M6-GATE PASS）
   - M7B：`run_M7B_only`（上一阶段 M7A-GATE PASS）
```

任一检查失败，父 agent 不派发子任务，先写 blocker 或修复当前阶段控制面。

**M7 子门**：派发 M7A/M7B 时，将模板中的 `{n}` 替换为 `7A` 或 `7B`；读 `M7-sync-backup-and-long-term-trust.md` 对应 §8.1/§8.2；**不得**把 M7B 当作 M6 的 `{n+1}` 自动推进。

---

## 子 Agent Prompt 模板

```text
你在 D:/my_brain 工作。你是 composer2.5 子 agent。

当前阶段：M{n} — {stage title}
你只能执行 M{n}。不得实现、重构、提前创建或验收 M{n+1} 及之后阶段的范围。

必须先读取：
- docs/MOBILE_PRODUCT_PLAN.md
- specs/mobile-app/EXECUTION_GUARDRAILS.md
- specs/mobile-app/GATE_VERIFIER_SPEC.md
- specs/mobile-app/M{n}-*.md
- specs/mobile-app/EXECUTION_STATE.json（若已存在）
- specs/mobile-app/reports/M{n-1}-GATE-report.md（若 n > 0）

本阶段目标：
- 按 M{n} spec 的「范围内」「测试计划」「验收标准」实施。
- 保持产品不变量：用户确认入库、自动整理可撤销、local-first、raw audio/full article 不长期保存、sync 不 silent create。
- 若遇到 DEGRADED，只能在 M{n} 内继续修复与验证；不得解锁 M{n+1}。
- 若遇到 hard stop，停止并写 blocker 报告，不得继续。

禁止事项：
- 不得跳过测试、不得 --no-verify、不得伪造 PASS。
- 不得把长期密钥写入仓库、APK、IPA、Share Extension。
- 不得让 packages/core 泄漏 React/RN/Zustand/import.meta.env/DOM/Web Audio/UI 库。
- 不得在 M2 MigrationGate ready 前挂载 LivingBrainHome 读写 SQLite。
- 不得在用户确认前创建 permanent node。
- 不得保存 raw audio、完整 transcript、全文 article。
- 不得把 M6-GATE 当作完整验收。
- M4：M2 后可并行文字/分享路径；**M4-GATE FULL PASS 须 M3-GATE PASS**；不得 bypass 语音相关 M4 能力。

完成后必须产出：
1. 文件变更列表。
2. 实际运行的测试命令、exit code、关键输出摘要。
3. specs/mobile-app/reports/M{n}-GATE-report.md 草稿。
4. 若失败：失败分类（FIXABLE_FAIL / DEGRADED / NEEDS_DEVICE_EVIDENCE / HARD_STOP）、日志、建议修复。
5. 明确声明：是否触碰 M{n+1}+ 范围。

不要提交 git，除非父 agent 后续明确要求。
```

---

## 父 Agent 验收模板

```text
1. git status / diff：确认变更未越界。
2. 读取 M{n}-GATE-report.md。
3. 运行 pnpm mobile:gate M{n}（M7 子门为 `M7A`/`M7B`；M7B PASS 后另跑聚合 `M7`；M0 创建脚本后必须真实存在）。
4. 若 verifier PASS：
   - 签核报告；`reports` 键与报告路径一致（M7A→`M7A`，M7B→`M7B`）。
   - 更新 EXECUTION_STATE.json（M0–M5→`M{n+1}`；M6→`M7A`；M7A→`M7B`；M7B→签核 `M7-GATE-report.md` 后 `complete`）。
   - 只允许下一轮派发下一阶段（M7B PASS 后先跑 `pnpm mobile:gate M7`，再 `complete`）。
5. 若 verifier FAIL：
   - 不推进 state。
   - 按同一 M{n} 重新派发修复任务。
6. 若 NEEDS_DEVICE_EVIDENCE：
   - 不推进 state（非 FAIL）。
   - 等待真机/人工证据写入报告后复验。
7. 若 HARD_STOP：
   - 更新 EXECUTION_STATE.json hardStop。
   - 输出 blocker，停止流水线。
```

---

## 修复循环上限

同一阶段最多 3 轮自动修复：

```text
attempt 1 -> fail -> same M repair
attempt 2 -> fail -> same M repair
attempt 3 -> fail -> BLOCKED report
```

3 轮后仍失败，父 agent 输出：

```text
STATUS: BLOCKED
PHASE: M{n}
FAILED_CHECK: ...
ATTEMPTED_FIXES: 3
NEXT_REQUIRED_ACTION: ...
```

这不是失败。坏软件继续往后跑才是失败。
