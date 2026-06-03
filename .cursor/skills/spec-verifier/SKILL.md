---
name: spec-verifier
description: >-
  Adversarially verify that already-implemented specs match expectations via a
  layered, evidence-gated subagent pipeline (objective gates → invariant audit →
  acceptance trace → behavioral run → adversarial review → root-cause → fix),
  with the main agent deciding and a bounded termination condition. Use when the
  user asks to "verify the specs are implemented as expected", "audit/accept the
  implementation", "确认代码是否按预期实现", "验收已实现的 spec", or distrusts
  self-reported ✅ statuses after an autonomous build run.
disable-model-invocation: true
---

# spec-verifier — 分层对抗式验收编排器

目标：**验证目前已实现的 spec 编码是否真按预期实现**，而不是相信自报的 `✅`。本技能把验收拆成分层角色，由**主 agent 决策**、**子代理取证/修复**，循环到「客观闸全绿 + 异源 reviewer 0 反例 + 必修清单清空 + 人类决策点全部解决」才结束。

## 硬性门禁：主 agent 职责边界（不可逾越，防 token 爆炸）

主 agent **只许「安排 + 判断」，绝不亲自下场干本该子代理做的活**。这道门禁优先级高于一切其它步骤。

**主 agent 允许做的（仅此）**：
- 派发子代理（`Task`）并给它精准范围与提示词；
- 读取子代理**返回的结构化结论**，套用证据闸做采信/打回；
- 综合证据、定严重度、做 go/no-go 与最终对抗裁决；
- 用 `AskQuestion` 向用户上交决策；用 `TodoWrite` 维护主循环；
- 写**编排产物**：合并报告 + `verification-state.md`。

**主 agent 禁止做的（必须委派给子代理）**：
- ❌ 自己 `Read` / `Grep` / `Glob` 去翻源码、爬调用链、读大文件 → 交 invariant-auditor / acceptance-tracer / root-cause；
- ❌ 自己跑 `typecheck/lint/test/coverage/build/boot` 等任何闸命令 → 交 gate-runner / behavioral-QA；
- ❌ 自己 `Edit` / `Write` 任何源码/测试/配置/spec → 交 fixer；
- ❌ 自己做根因诊断或写补丁。

**自检触发**：当主 agent 发现自己即将调用 `Read/Grep/Glob/Edit/Write`（源码类）或运行任何闸命令时——**停手，改为派一个子代理**。唯一例外：写 `verification-state.md` 与合并报告这两类编排产物。

这样主上下文只进出「精简结论 + 决策」，重活（读码/跑命令/改码）的 token 全部落在一次性的子代理里，主上下文不被源码与命令输出撑爆。

## 第一性原理（贯穿全程）

1. **声明 ≠ 证据**：任何 spec 头部 `✅`、自评 PASS、口头「我看过了没问题」**一律不采信**。每条结论必须附 `file:line` 或**原始命令输出**，否则打回。
2. **单测绿 ≠ 跑得起来**：逐 spec 的 `check` 不 boot/build，配置级回归能穿过每一道单测闸。**客观闸必须含真 boot + build**。
3. **找错与修错分离**：fixer 不能给自己的修复打分；修完只重跑「失败的那一层」，由独立角色复验。
4. **降智只许发生在「执行」，不许发生在「判断」**：省 token 靠窄范围 + 只读 + 精准喂上下文，不靠把判断者换笨。

## 可移植配置区（每个项目开工前由主 agent 填写）

不要硬编码某个仓库。开工先确定并复述以下 `CONFIG`：

```
PROJECT_ROOT      : 仓库根
SPEC_INDEX        : spec 路线图/索引文件（如 specs/README.md），含状态字段
SPEC_GLOB         : spec 文件位置（如 specs/*.md）
INVARIANTS_SRC    : 不变量来源（如 AGENTS.md + specs/README.md 不变量表）
GATE_TYPECHECK    : 类型检查命令（如 pnpm typecheck）
GATE_LINT         : lint 命令（如 pnpm lint）
GATE_TEST         : 测试命令（如 pnpm test）
GATE_COVERAGE     : 覆盖率命令 + 下限来源（如 pnpm coverage；下限见某硬化 spec）
GATE_BUILD        : 生产构建命令（如 pnpm build）—— 必含
GATE_BOOT         : 真启动命令 + 健康判据（如 pnpm dev，端口 1420 起来无致命报错）—— 必含
SHELL             : 目标 shell（如 PowerShell：命令逐行、禁用 && 连接）
SCOPE             : all | changed | <指定 spec 列表>
RULES_DIR         : 额外规则目录（如 .cursor/rules/）
```

找不到某项就**停下问用户**，不要猜。

## 模型路由（本仓锁定）

- **主 agent（编排+决策）**：运行本技能的当前会话，应为**强模型**——综合矛盾证据、定严重度、识破子代理糊弄、做 go/no-go 与最终对抗裁决。
- **所有子代理**：统一用 `composer-2.5-fast`（gate-runner / invariant-auditor / acceptance-tracer / behavioral-QA / adversarial-reviewer / root-cause / fixer 都是它）。
- **独立性说明**：子代理层不再异源，**异源独立性靠主 agent 用更强的异源模型做最终裁决来兜底**。若日后要恢复子代理异源，只改下面调用里 adversarial-reviewer 的 `model` 一处即可。

调用方式：`Task` 工具，`model: "composer-2.5-fast"`；只读角色 `readonly: true`；按角色选 `subagent_type`（取证/审计/复审/根因/修复用 `generalPurpose`，纯跑命令用 `shell`，真跑 UI 用 `browser-use`）。文件集不相交的只读任务可并行；写操作一律串行。

## 主循环（复制并逐轮更新）

```
Verifier Progress:
- [ ] 0. 填 CONFIG + 复述 SCOPE 与不变量清单 + 读 SPEC_INDEX 建状态视图
- [ ] 1. L0/L1 客观闸（gate-runner，跑命令贴原始输出）
- [ ] 2. L2 不变量取证（invariant-auditor，只读）
- [ ] 3. L3 验收清单溯源（acceptance-tracer，只读；挑高风险 spec）
- [ ] 4. 主 agent 合并必修清单（P0/P1/P2 + 是否阻断交付 + 性质）
- [ ] 5. 决策分流：纯 bug→修复轮；spec 字面 vs 实现 分歧→停下交人（见“决策上交点”）
- [ ] 6. 修复轮（root-cause→fixer→重跑失败那层闸；最多 3 轮/项）
- [ ] 7. L4 行为验收（behavioral-QA，真 boot+点关键流程）—— 仅在 GATE_BUILD/BOOT 绿后
- [ ] 8. L5 对抗复审（adversarial-reviewer，只读，敌意视角找反例）
- [ ] 9. 判定终止条件；未满足则回 4
```

每层用**全新上下文子代理**；每个子代理只喂它该看的确切文件，范围越窄越省 token。

各层角色的完整提示词模板见 [prompts.md](prompts.md)——主 agent 取用时把 `CONFIG` 实参填进去再派发。

## 证据闸（反作弊，每个子代理产物都过这关）

主 agent 收到子代理结论后，**先验证据再采信**：

- 写「满足/无违反」却没有调用点枚举或 `file:line` → 判为**未取证**，打回重做。
- 写「已修复/通过」却没贴**原始命令输出**（且未截断）→ 打回。
- L5 reviewer 的每条「问题」必须带证据 + 严重度；只有口水结论 → 不计入。

## 决策上交点（human-in-the-loop，主 agent 不得替用户拍板）

- **纯 bug / 闸门漏洞**（如构建挂、typecheck 盲区）→ 直接进修复轮。
- **「spec 字面 vs 实现」分歧**（实现满足不变量精神，但与 spec 文字不符）→ **停下交用户二选一**：A 改 spec 文字以匹配现实；B 改代码以匹配 spec。**禁止 AI 自行改 spec 或重构**。
- **外部契约未决 / 需破坏性操作 / 触发任一不变量风险** → 停下问。

## 合并报告格式（主 agent 产出）

```
## 验收结论：PASS | FAIL | BLOCKED(待用户决策)

### 必修清单
| 编号 | 问题 | 证据(file:line/输出) | 严重度(🔴/🟠/🟡/🟢) | 阻断交付 | 性质(bug/闸门/设计/分歧/加固) |

### 客观闸
typecheck/lint/test/coverage/build/boot 各自 绿/红 + 关键数字

### 不变量逐条
每条：满足/违反/存疑 + 证据

### 待用户决策项（如有）
P 编号 + A/B 选项

### 本轮未验（环境受限）
如 Tauri 构建、分支保护、视觉 E2E —— 标“证据未采集”，非“已证伪”
```

把进度与必修清单写进 `verification-state.md`（同目录），支持中断后接着跑。

## 终止条件（有界，不写“完美”）

**DONE（验收通过）当且仅当**：

1. 全部客观闸绿：`GATE_TYPECHECK` `GATE_LINT` `GATE_TEST` `GATE_COVERAGE`(达下限) `GATE_BUILD` `GATE_BOOT` 均**真跑通过并有原始输出**；
2. 最新一轮 L5 对抗 reviewer 返回 **0 条可证伪反例**；
3. 必修清单中 P0/P1 **清空**（P2 加固项可列为「建议」不阻断，由用户确认）；
4. 所有「决策上交点」已被用户裁决并落地。

**STOP（停下交人，不硬闯）当**：

- 某项连续 **3 轮**仍闸红或 reviewer 找到反例；
- 出现「spec 字面 vs 实现」分歧或外部契约未决；
- 需破坏性/不可逆操作，或会违反任一不变量/规则；
- SCOPE 内仍有未验 spec 但其依赖/环境不满足。

## 安全护栏

- 禁破坏性操作、禁提交密钥、禁改 git config、禁 `--no-verify`。
- 修复轮单一 spec/单一问题一个 Conventional Commit；**先不 push**，由用户决定。
- 子代理不得越 SCOPE 改无关文件；一旦改动清单冒出无关 spec/文件即判越界、打回。
