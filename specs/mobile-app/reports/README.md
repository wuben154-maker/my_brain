# M 阶段验收报告目录



> **状态**：M0 实施时由父 agent / verifier 正式启用。当前 README 仅用于让报告目录可追踪。



本目录保存每个阶段的 gate 通行证：



```text

M0-GATE-report.md

M1-GATE-report.md

M2-GATE-report.md

M3-GATE-report.md

M4-GATE-report.md

M5-GATE-report.md

M6-GATE-report.md

M7A-GATE-report.md

M7B-GATE-report.md

M7-GATE-report.md

```



规则：



- `PASS` 报告是进入下一阶段的唯一通行证。

- `DEGRADED`、`FAIL`、`BLOCKED`、`NEEDS_DEVICE_EVIDENCE` 不解锁下一阶段。

- M7A-GATE PASS 后 `currentPhase` 方可进入 `M7B`；M7B-GATE PASS 后方可签核 M7-GATE。

- M7-GATE 必须附录 M0–M6 及 M7A、M7B 全部 `PASS` 报告。

- 报告格式以 [`../EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) §8 为准。

- 机器验证以 [`../GATE_VERIFIER_SPEC.md`](../GATE_VERIFIER_SPEC.md) 为准。

- `EXECUTION_STATE.reports` 键：`M0`…`M6`、`M7A`、`M7B`、`M7`（总验收）。


