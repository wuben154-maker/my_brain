# H0 — 覆盖率棘轮 + 分支保护（`coverage-ratchet`）

- **类型：** 硬化（Hardening）· **状态：** ✅ 已实现
- **执行时机：** **现在，A4 之前**（独立的"基建棘轮"小 PR）
- **上游：** 现有 `pnpm check` + CI（`.github/workflows/ci.yml`）· **下游：** 此后每个里程碑都被它约束

## 1. 目标
趁代码还少，先架好两道"棘轮"，让后续所有里程碑被迫遵守：
1. **测试覆盖率下限**：新代码不带测试就会让 CI 红。
2. **分支保护**：CI 不绿不能合并（否则 CI 只是摆设）。

## 2. 非目标
- 不追求高覆盖率数字，只设**当前基线**并只许向上（ratchet up），不许回退。
- 不强求 UI 组件高覆盖（难测且回报低）；聚焦**纯逻辑**目录。
- 不把 coverage 塞进本地 `pnpm check`（保持本地快）；覆盖率在 CI 强制。

## 3. 配置契约
**依赖**：`pnpm add -D @vitest/coverage-v8`。

`vitest.config.ts` 增加 coverage（阈值聚焦逻辑层，排除 UI / 类型 / 测试本身）：
```ts
test: {
  environment: "node",
  include: ["src/**/*.test.ts"],
  coverage: {
    provider: "v8",
    include: ["src/lib/**", "src/agent/**", "src/domain/**", "src/stores/**", "src/storage/**"],
    exclude: ["**/*.test.ts", "src/**/types.ts", "src/components/**", "src/dev/**"],
    thresholds: { lines: 58, functions: 75, branches: 60, statements: 58 }, // 实测基线 ~59.8%，略低以 ratchet up
  },
}
```
`package.json` 增脚本：`"coverage": "vitest run --coverage"`。
CI（`ci.yml`）把 `pnpm check` 后追加一步 `pnpm coverage`（或将 test 步替换为 coverage）。

**分支保护（GitHub 仓库设置，手动 ops，spec 内留可验证清单）**：
- main 开启 "Require status checks to pass before merging" → 勾选 `CI / check`。
- 开启 "Require a pull request before merging"。

## 4. 验收清单
- [x] 本地 `pnpm coverage` 能跑出报告且通过阈值（先把阈值设到≤当前实测值，确保一开始就是绿）。
- [x] 故意删掉某逻辑文件的测试 → `pnpm coverage` 红（证明棘轮生效）。实测：移除 `proposalStore.test.ts` → 53.5% < 58% 阈值。
- [x] CI 包含覆盖率步骤，PR 上会跑。
- [x] GitHub 分支保护已开（`gh api` 2026-06-02）：main 要求 `check` 状态 + PR；配置见 `scripts/branch-protection-main.json`。
- [x] `pnpm check`（本地快闸门）仍不含 coverage，保持快。

## 5. 风险与对策
| 风险 | 对策 |
|---|---|
| 阈值设太高一上来就红 | 先 `pnpm coverage` 看实测值，阈值设在略低处，之后逐步 ratchet up |
| UI 难测拉低覆盖 | coverage `include` 只圈逻辑目录，`exclude` 掉 `components/` |

## 6. DoD
基线阈值下 `pnpm coverage` 绿；CI 跑覆盖率；分支保护开启。此后新功能不带测试即被 CI 挡下。
