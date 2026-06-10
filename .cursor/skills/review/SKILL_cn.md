---
name: review
preamble-tier: 4
version: 1.0.0
description: |
  上线前 PR review。针对 base branch 的 diff 分析 SQL 安全、LLM 信任边界违规、
  条件副作用及其他结构性问题。在用户说「review this PR」「code review」
  「pre-landing review」「check my diff」时使用。
  在用户即将 merge 或 land 代码时主动建议。
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
  - WebSearch
---

## AskUserQuestion 格式

**每次调用 AskUserQuestion 都必须遵循以下结构：**
1. **重新锚定：** 说明项目、当前分支（使用 preamble 打印的 `_BRANCH`——不要用对话历史或 gitStatus 中的分支），以及当前计划/任务。（1–2 句）
2. **简化：** 用简明中文说明问题（聪明中学生能懂；必要处保留英文术语）。不要裸函数名、不要内部行话、不要实现细节。用具体例子和类比。说它**做什么**，不要说它**叫什么**。
3. **建议：** `RECOMMENDATION: Choose [X] because [one-line reason]` —— 始终优先完整方案（见 Completeness Principle）。每个选项 `Completeness: X/10`。校准：10 = 完整实现，7 = happy path，3 = 捷径。若两选项都 ≥8 选更高；若有一项 ≤5 标出。
4. **选项：** 字母选项 `A) ... B) ... C) ...` —— 涉及工作量时同时给出 `(human: ~X / CC: ~Y)`

假设用户 20 分钟没看窗口、也没打开代码。若需读源码才能向自己讲清楚，则太复杂。

各 skill 可在本基线之上增加规则。

## Completeness Principle —— Boil the Lake

AI 使「完整」近乎免费。始终推荐完整方案。CC+gstack 下差额仅分钟级。「湖」可煮，「洋」标出。

**工作量参考** —— 始终显示两种尺度：

| Task type | Human team | CC+gstack | Compression |
|-----------|-----------|-----------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

每个选项 `Completeness: X/10`（10=全部边缘，7=happy path，3=捷径）。

## Repo Ownership —— See Something, Say Something

`REPO_MODE` 控制分支外问题如何处理：
- **`solo`** —— 你拥有一切。主动调查并提议修复。
- **`collaborative`** / **`unknown`** —— 用 AskUserQuestion 标出，不要擅自修复（可能是别人的）。

任何可疑之处都要标一句：注意到了什么、影响是什么。

## Search Before Building

构建不熟悉的东西前，**先搜索。** 见 `~/.claude/skills/gstack/ETHOS.md`。
- **Layer 1**（久经考验）—— 不要重复造轮。**Layer 2**（新且流行）—— 审慎。**Layer 3**（第一性原理）—— 最珍视。

**Eureka：** 第一性原理与常识冲突时，命名并记录：
```bash
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg skill "SKILL_NAME" --arg branch "$(git branch --show-current 2>/dev/null)" --arg insight "ONE_LINE_SUMMARY" '{ts:$ts,skill:$skill,branch:$branch,insight:$insight}' >> ~/.gstack/analytics/eureka.jsonl 2>/dev/null || true
```

## Contributor Mode

若 `_CONTRIB` 为 `true`：**contributor mode**。每个主要 workflow 步骤末尾为 gstack 体验打分 0–10。若非 10 且有可操作改进——写 field report。

**仅记录：** 输入合理但 gstack 失败的工具问题。**跳过：** 用户应用 bug、网络、站点鉴权失败。

**提交：** `~/.gstack/contributor-logs/{slug}.md`：
```
# {Title}
**What I tried:** {action} | **What happened:** {result} | **Rating:** {0-10}
## Repro
1. {step}
## What would make this a 10
{one sentence}
**Date:** {YYYY-MM-DD} | **Version:** {version} | **Skill:** /{skill}
```
Slug：小写连字符，最长 60。已存在则跳过。每 session 最多 3 条。内联写入，不停。

## Completion Status Protocol

完成 skill workflow 时用以下之一报告：
- **DONE** —— 全部成功，每项有证据。
- **DONE_WITH_CONCERNS** —— 完成但有应注意问题，逐条列出。
- **BLOCKED** —— 无法继续，说明阻塞与尝试。
- **NEEDS_CONTEXT** —— 缺少信息，明确写出需要什么。

### Escalation

可随时停下说不确定或太难。

糟糕工作比没有更糟。升级不处罚。
- 同任务 3 次失败 → STOP。
- 安全敏感不确定 → STOP。
- 范围超出可验证 → STOP。

Escalation 格式：
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

## Telemetry（最后运行）

workflow 完成后记录 telemetry。从 frontmatter `name:` 取 skill 名。根据结果 success/error/abort。

**PLAN MODE 例外 —— 始终执行：** 写入 `~/.gstack/analytics/`。跳过会丢失时长与 outcome。

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

替换 SKILL_NAME、OUTCOME（success/error/abort）、USED_BROWSE（是否用 `$B`）。未知则用 "unknown"。后台运行。

## Plan Status Footer

plan mode 即将 ExitPlanMode 时：

1. 检查是否已有 `## GSTACK REVIEW REPORT`。
2. 若有 —— 跳过。
3. 若无 —— 运行：

\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-read
\`\`\`

然后在 plan 文件末尾写 `## GSTACK REVIEW REPORT`：

- 若有 review 条目（`---CONFIG---` 前 JSONL）：标准表。
- 若为 `NO_REVIEWS` 或空：占位表：

\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | 0 | — | — |
| Codex Review | \`/codex review\` | Independent 2nd opinion | 0 | — | — |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | 0 | — | — |
| Design Review | \`/plan-design-review\` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run \`/autoplan\` for full review pipeline, or individual reviews above.
\`\`\`

**PLAN MODE 例外：** 写入 plan 文件；plan mode 下允许编辑该文件。

## Step 0: Detect base branch

确定此 PR 指向的分支。后续所有步骤中「base branch」均用检测结果。

1. 是否已有 PR：`gh pr view --json baseRefName -q .baseRefName`。成功则用打印名。
2. 无 PR（命令失败）：检测 default：`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`
3. 都失败：回退 `main`。

打印检测到的 base branch。后续所有 `git diff`、`git log`、`git fetch`、`git merge`、`gh pr create` 中凡写「the base branch」处替换为检测名。

---

# Pre-Landing PR Review

你正在运行 `/review` workflow。针对当前分支相对 base branch 的 diff，查找测试抓不住的结构性问题。

---

## Step 1: Check branch

1. `git branch --show-current` 取当前分支。
2. 若在 base branch：输出 **"Nothing to review — you're on the base branch or have no changes against it."** 并停止。
3. `git fetch origin <base> --quiet && git diff origin/<base> --stat`。若无 diff，同上并停止。

---

## Step 1.5: Scope Drift Detection

评代码质量前先问：**是否按要求建造——不多不少？**

1. 读 `TODOS.md`（若存在）。读 PR 描述（`gh pr view --json body --jq .body 2>/dev/null || true`）。
   读 commit messages（`git log origin/<base>..HEAD --oneline`）。
   **若无 PR：** 常见——依赖 commit messages 与 TODOS.md 表达意图。
2. 识别**陈述意图**——分支本应完成什么？
3. `git diff origin/<base>...HEAD --stat`，对照变更文件与陈述意图。

### Plan File Discovery

1. **对话上下文（优先）：** 检查本会话是否有活跃 plan——Claude Code 在 plan mode 的系统消息可能含 `~/.claude/plans/*.md`。若找到则直接用。

2. **内容搜索（后备）：** 若上下文无 plan：

```bash
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)")
# Try branch name match first (most specific)
PLAN=$(ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$BRANCH" 2>/dev/null | head -1)
# Fall back to repo name match
[ -z "$PLAN" ] && PLAN=$(ls -t ~/.claude/plans/*.md 2>/dev/null | xargs grep -l "$REPO" 2>/dev/null | head -1)
# Last resort: most recent plan modified in the last 24 hours
[ -z "$PLAN" ] && PLAN=$(find ~/.claude/plans -name '*.md' -mmin -1440 -maxdepth 1 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
[ -n "$PLAN" ] && echo "PLAN_FILE: $PLAN" || echo "NO_PLAN_FILE"
```

3. **校验：** 若非对话上下文找到而是内容搜索找到，读前 20 行确认与当前分支工作相关。若似其他项目/功能，视为未找到 plan。

**错误处理：**
- 未找到 plan → 跳过，「No plan file detected — skipping.」
- 找到但不可读 → 「Plan file found but unreadable — skipping.」

### Actionable Item Extraction

读 plan，抽取所有可执行项——描述要做的任何事：

- **Checkbox：** `- [ ]` / `- [x]`
- **编号步骤**（实现标题下）："1. Create ...", ...
- **祈使句：** "Add X to Y", ...
- **文件级规格：** "New file: ...", "Modify ..."
- **测试要求：** "Test that ...", ...
- **数据模型：** "Add column ...", ...

**忽略：**
- Context/Background（`## Context` 等）
- 问号、TBD、「TODO: decide」
- `## GSTACK REVIEW REPORT`
- 明确延期（"Future:", "Out of scope:", "NOT in scope:", "P2–P4:")
- CEO Review Decisions（记录选择非工作项）

**上限：** 最多 50 条。更多则注："Showing top 50 of N plan items — full list in plan file."

**无可抽取项：** 「Plan file contains no actionable items — skipping completion audit.」

每条记录：原文或摘要；类别 CODE | TEST | MIGRATION | CONFIG | DOCS。

### Cross-Reference Against Diff

`git diff origin/<base>...HEAD` 与 `git log origin/<base>..HEAD --oneline`。

每条 plan 项对照 diff 分类：

- **DONE** —— diff 中有清晰证据。引用具体文件。
- **PARTIAL** —— 有部分工作但不完整。
- **NOT DONE** —— 无证据表明已处理。
- **CHANGED** —— 实现路径不同但目标达成。注明差异。

**DONE 偏保守** —— 需清晰证据；触及文件不够。**CHANGED 偏宽容** —— 目标达成即可。

### Output Format

```
PLAN COMPLETION AUDIT
═══════════════════════════════
Plan: {plan file path}

## Implementation Items
  [DONE]      Create UserService — src/services/user_service.rb (+142 lines)
  [PARTIAL]   Add validation — model validates but missing controller checks
  [NOT DONE]  Add caching layer — no cache-related changes in diff
  [CHANGED]   "Redis queue" → implemented with Sidekiq instead

## Test Items
  [DONE]      Unit tests for UserService — test/services/user_service_test.rb
  [NOT DONE]  E2E test for signup flow

## Migration Items
  [DONE]      Create users table — db/migrate/20240315_create_users.rb

─────────────────────────────────
COMPLETION: 4/7 DONE, 1 PARTIAL, 1 NOT DONE, 1 CHANGED
─────────────────────────────────
```

### Integration with Scope Drift Detection

plan 完成结果补充 Scope Drift。**NOT DONE** 成为 **MISSING REQUIREMENTS** 的额外证据。**diff 中不匹配任何 plan 项的变更** 成为 **SCOPE CREEP** 证据。

此为**信息性**——不阻塞 review（与既有 scope drift 一致）。

更新 scope drift 输出含 plan 上下文：

```
Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
Intent: <from plan file — 1-line summary>
Plan: <plan file path>
Delivered: <1-line summary of what the diff actually does>
Plan items: N DONE, M PARTIAL, K NOT DONE
[If NOT DONE: list each missing item]
[If scope creep: list each out-of-scope change not in the plan]
```

**无 plan：** 回退到仅 TODOS.md 与 PR 描述。

4. 带着怀疑评估（若有 plan 完成结果）：

   **SCOPE CREEP：**
   - 与陈述意图无关的变更文件
   - plan 未提及的新特性或重构
   - 「顺手」扩大爆炸半径的改动

   **MISSING REQUIREMENTS：**
   - TODOS.md/PR 描述中的需求未在 diff 中体现
   - 陈述需求的测试缺口
   - 部分实现（开了头未完成）

5. 输出（主 review 开始前）：
   ```
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   Intent: <1-line summary of what was requested>
   Delivered: <1-line summary of what the diff actually does>
   [If drift: list each out-of-scope change]
   [If missing: list each unaddressed requirement]
   ```

6. **信息性**——不阻塞。继续 Step 2。

---

## Step 2: Read the checklist

读 `.claude/skills/review/checklist.md`。

**若无法读取，STOP 并报错。** 无 checklist 不得继续。

---

## Step 2.5: Check for Greptile review comments

读 `.claude/skills/review/greptile-triage.md`，执行 fetch、filter、classify、**escalation detection**。

**若无 PR、`gh` 失败、API 错误或 Greptile 评论数为 0：** 静默跳过。Greptile 为附加能力。

**若有 Greptile 评论：** 保存分类（VALID & ACTIONABLE、VALID BUT ALREADY FIXED、FALSE POSITIVE、SUPPRESSED）—— Step 5 要用。

---

## Step 3: Get the diff

拉最新 base 避免本地陈旧误报：

```bash
git fetch origin <base> --quiet
```

`git diff origin/<base>` 取完整 diff（相对最新 base 的已提交与未提交变更）。

---

## Step 4: Two-pass review

对照 checklist 对 diff 两轮：

1. **Pass 1 (CRITICAL)：** SQL & Data Safety、Race Conditions & Concurrency、LLM Output Trust Boundary、Enum & Value Completeness
2. **Pass 2 (INFORMATIONAL)：** Conditional Side Effects、Magic Numbers & String Coupling、Dead Code & Consistency、LLM Prompt Issues、Test Gaps、View/Frontend、Performance & Bundle Impact

**Enum & Value Completeness 需读 diff 外代码。** diff 引入新 enum 值、status、tier 或类型常量时，用 Grep 找引用兄弟值的文件，Read 检查新值是否被处理。仅此一类不能仅靠 diff。

**Search-before-recommending：** 推荐修复模式前（尤其并发、缓存、鉴权、框架行为）：
- 验证对当前框架版本是否仍为最佳实践
- 新版本是否有内置方案再推荐 workaround
- 对照当前文档核对 API 签名

几秒可避免过时建议。WebSearch 不可用则注明并用发行版内知识。

遵循 checklist 输出格式。尊重 suppressions——不要标记「DO NOT flag」中的项。

---

## Step 4.5: Design Review（条件）

## Design Review（条件，diff 范围）

用 `gstack-diff-scope` 检查 diff 是否触及 frontend：

```bash
source <(~/.claude/skills/gstack/bin/gstack-diff-scope <base> 2>/dev/null)
```

**若 `SCOPE_FRONTEND=false`：** 静默跳过 design review。无输出。

**若 `SCOPE_FRONTEND=true`：**

1. **查 DESIGN.md。** 若根目录有 `DESIGN.md` 或 `design-system.md` 则读。DESIGN.md 中认可的 pattern 不标记。无则用通用设计原则。

2. **读 `.claude/skills/review/design-checklist.md`。** 无法读取则注："Design checklist not found — skipping design review."

3. **读每个变更的 frontend 文件**（全文，非仅 hunk）。文件模式见 checklist。

4. **对变更文件应用 design checklist。** 每项：
   - **[HIGH] 机械 CSS 修复**（`outline: none`、`!important`、`font-size < 16px`）：标为 AUTO-FIX
   - **[HIGH/MEDIUM] 需设计判断**：标为 ASK
   - **[LOW] 意图类**：呈现为 "Possible — verify visually or run /design-review"

5. **在 "Design Review" 标题下纳入 findings**，格式见 checklist。与 code review 合并进入同一 Fix-First 流。

6. **记录** Review Readiness Dashboard：

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

TIMESTAMP=ISO 8601，STATUS=clean 或 issues_found，N/M，COMMIT=`git rev-parse --short HEAD`。

7. **Codex design voice**（可选，若可用）：

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

若 Codex 可用，对 diff 做轻量 design 检查：

```bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): 1. Brand/product unmistakable in first screen? 2. One strong visual anchor present? 3. Page understandable by scanning headlines only? 4. Each section has one job? 5. Are cards actually necessary? 6. Does motion improve hierarchy or atmosphere? 7. Would design feel premium with all decorative shadows removed? Flag any hard rejections: 1. Generic SaaS card grid as first impression 2. Beautiful image with weak brand 3. Strong headline with no clear action 4. Busy imagery behind text 5. Sections repeating same mood statement 6. Carousel with no narrative purpose 7. App UI made of stacked cards instead of layout 5 most important design findings only. Reference file:line." -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached 2>"$TMPERR_DRL"
```

5 分钟超时（`timeout: 300000`）。完成后：
```bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
```

**错误处理：** 均不阻塞。鉴权失败、超时、空响应——简短说明后继续。

Codex 输出放在 `CODEX (design):` 标题下，与 checklist findings 合并。

设计 findings 与 Step 4 一并进入 Fix-First Step 5。

---

## Step 4.75: Test Coverage Diagram

目标 100% 覆盖。评估 diff 中每条变更路径的测试缺口。缺口为 INFORMATIONAL，走 Fix-First。

### Test Framework Detection

分析覆盖前先检测测试框架：

1. **读 CLAUDE.md** —— 若有 `## Testing` 含命令与框架名，以此为准。
2. **若 CLAUDE.md 无 testing 节，自动检测：**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
```

3. **若未检测到框架：** 仍产出 coverage diagram，但跳过测试生成。

**Step 1. 追踪每条变更路径** 用 `git diff origin/<base>...HEAD`：

读每个变更文件。对每文件追踪数据流——不要只列函数，要跟随执行：

1. **读 diff。** 全文读变更文件以理解上下文。
2. **追踪数据流。** 从每个入口（route handler、导出函数、事件监听、组件 render）跟随每条分支：
   - 输入从哪来？（request params、props、DB、API）
   - 如何变换？（校验、映射、计算）
   - 输出到哪？（DB 写、API 响应、渲染、副作用）
   - 每步可能出何错？（null、非法输入、网络、空集合）
3. **ASCII 图。** 每变更文件画：
   - 新增或修改的每个函数/方法
   - 每个条件分支（if/else、switch、三元、guard、早返回）
   - 每条错误路径（try/catch、rescue、error boundary、fallback）
   - 对每个函数的调用（继续追踪——其分支是否未测）
   - 每条边：null 输入？空数组？非法类型？

这是关键——你在绘制每条因输入不同而可能执行的代码线图。图中每条分支都需要测试。

**Step 2. 映射用户流、交互与错误状态：**

仅有 code coverage 不够——要覆盖真实用户如何与变更代码交互。对每个变更特性思考：

- **User flows：** 用户触达此代码的动作序列？完整旅程（如点击 Pay → 校验 → API → 成败页）。旅程每步需测试。
- **交互边缘：** 用户意外行为？
  - 双击/快速重复提交
  - 操作中导航离开（后退、关 tab、点别的链接）
  - 陈旧数据提交（页面开 30 分钟、session 过期）
  - 慢网络（API 10 秒——用户看到什么？）
  - 并发（两 tab、同一表单）
- **用户可见错误状态：** 代码处理的每个错误，用户实际体验？
  - 清晰错误信息还是静默失败？
  - 能否恢复（重试、返回、改输入）还是卡住？
  - 无网络？API 500？服务端非法数据？
- **空/零/边界状态：** UI 在 0 条结果、10000 条、单字符、最大长度输入时？

把这些与代码分支并列加入图。无测试的用户流与未测的 if/else 一样是缺口。

**Step 3. 每条分支对照现有测试：**

逐分支——代码路径与用户流。每条搜索是否有测试覆盖：
- `processPayment()` → `billing.test.ts` 等
- if/else → 真假路径是否都有测
- error handler → 是否触发该错误的测试
- `helperFn()` 自有分支 → 那些分支也需测
- user flow → 是否有 integration/E2E 走完全程
- 交互边缘 → 是否模拟意外行为

质量评分：
- ★★★ 行为含边缘与错误路径
- ★★ 仅正确行为 happy path
- ★ 烟测/存在性/琐碎断言（如 "it renders"）

### E2E Test Decision Matrix

判断每条分支适合 unit 还是 E2E/integration：

**建议 E2E（图中标 [→E2E]）：**
- 跨 3+ 组件/服务的常见用户流
- mock 会掩盖真实失败的集成点（API → queue → worker → DB）
- 鉴权/支付/删数据流——仅 unit 不够

**建议 EVAL（标 [→EVAL]）：**
- 需质量 eval 的关键 LLM 调用
- prompt 模板、system 指令、tool 定义变更

**继续用 UNIT：**
- 输入输出清晰的纯函数
- 无副作用的内部 helper
- 单函数边缘（null、空数组）
- 非面向客户的罕见流

### REGRESSION RULE（强制）

**铁律：** coverage 审计若识别 **REGRESSION**（曾工作、被 diff 破坏）——立即写 regression test。无 AskUserQuestion。不可跳过。Regression 是最高优先级测试。

Regression 指：
- diff 改的是既有行为（非全新代码）
- 现有测试未覆盖变更路径
- 为既有调用方引入新失败模式

不确定时倾向写测试。

Commit 格式：`test: regression test for {what broke}`

**Step 4. 输出 ASCII coverage diagram：**

代码路径与用户流同图。标记值得 E2E / eval 的路径：

```
CODE PATH COVERAGE
===========================
[+] src/services/billing.ts
    │
    ├── processPayment()
    │   ├── [★★★ TESTED] Happy path + card declined + timeout — billing.test.ts:42
    │   ├── [GAP]         Network timeout — NO TEST
    │   └── [GAP]         Invalid currency — NO TEST
    │
    └── refundPayment()
        ├── [★★  TESTED] Full refund — billing.test.ts:89
        └── [★   TESTED] Partial refund (checks non-throw only) — billing.test.ts:101

USER FLOW COVERAGE
===========================
[+] Payment checkout flow
    │
    ├── [★★★ TESTED] Complete purchase — checkout.e2e.ts:15
    ├── [GAP] [→E2E] Double-click submit — needs E2E, not just unit
    ├── [GAP]         Navigate away during payment — unit test sufficient
    └── [★   TESTED]  Form validation errors (checks render only) — checkout.test.ts:40

[+] Error states
    │
    ├── [★★  TESTED] Card declined message — billing.test.ts:58
    ├── [GAP]         Network timeout UX (what does user see?) — NO TEST
    └── [GAP]         Empty cart submission — NO TEST

[+] LLM integration
    │
    └── [GAP] [→EVAL] Prompt template change — needs eval test

─────────────────────────────────
COVERAGE: 5/13 paths tested (38%)
  Code paths: 3/5 (60%)
  User flows: 2/8 (25%)
QUALITY:  ★★★: 2  ★★: 2  ★: 1
GAPS: 8 paths need tests (2 need E2E, 1 needs eval)
─────────────────────────────────
```

**Fast path：** 全覆盖 → "Step 4.75: All new code paths have test coverage ✓" 继续。

**Step 5. 为缺口生成测试（Fix-First）：**

若检测到测试框架且有缺口：
- 按 checklist Fix-First Heuristic 分为 AUTO-FIX 或 ASK
- AUTO-FIX：生成测试、运行、commit `test: coverage for {feature}`
- ASK：与其它 review findings 一并批量 AskUserQuestion
- [→E2E]：始终 ASK
- [→EVAL]：始终 ASK

未检测到框架 → 仅 INFORMATIONAL findings，不生成。

**Diff 仅测试变更：** 完全跳过 Step 4.75："No new application code paths to audit."

### Coverage Warning

产出 diagram 后检查覆盖率百分比。读 CLAUDE.md `## Test Coverage` 的 `Minimum:`。无则默认 60%。

低于最低阈值时，在常规 findings **之前** 醒目警告：

```
⚠️ COVERAGE WARNING: AI-assessed coverage is {X}%. {N} code paths untested.
Consider writing tests before running /ship.
```

信息性——不阻塞 /review。但让低覆盖尽早可见。

无法确定百分比则静默跳过警告。

本步吸收 Pass 2 的「Test Gaps」——不要在 checklist Test Gaps 与 diagram 间重复。缺口与 Step 4、4.5 findings 一并 Fix-First。

---

## Step 5: Fix-First Review

**每条 finding 都要有动作——不只 critical。**

摘要头：`Pre-Landing Review: N issues (X critical, Y informational)`

### Step 5a: Classify each finding

每条按 checklist Fix-First Heuristic 分为 AUTO-FIX 或 ASK。Critical 偏 ASK；informational 偏 AUTO-FIX。

### Step 5b: Auto-fix all AUTO-FIX items

直接应用。每项一行：`[AUTO-FIXED] [file:line] Problem → what you did`

### Step 5c: Batch-ask about ASK items

若有 ASK，**一次** AskUserQuestion：

- 每项编号、严重度、问题、建议修复
- 每项选项：A) Fix as recommended, B) Skip
- 总体 RECOMMENDATION

示例：
```
I auto-fixed 5 issues. 2 need your input:

1. [CRITICAL] app/models/post.rb:42 — Race condition in status transition
   Fix: Add `WHERE status = 'draft'` to the UPDATE
   → A) Fix  B) Skip

2. [INFORMATIONAL] app/services/generator.rb:88 — LLM output not type-checked before DB write
   Fix: Add JSON schema validation
   → A) Fix  B) Skip

RECOMMENDATION: Fix both — #1 is a real race condition, #2 prevents silent data corruption.
```

ASK ≤3 条时可改用单独 AskUserQuestion。

### Step 5d: Apply user-approved fixes

对用户选 "Fix" 的项应用修复。输出修了啥。

无 ASK（全 AUTO-FIX）则不问。

### Verification of claims

最终输出前：
- 若声称「此 pattern 安全」→ 引用证明安全的具体行
- 若声称「别处已处理」→ 读并引用处理代码
- 若声称「测试覆盖」→ 给出测试文件与方法名
- 不说 "likely handled" / "probably tested" —— 核实或标 unknown

**Rationalization prevention：** "This looks fine" 不是 finding。要么引用证据证明没问题，要么标未核实。

### Greptile comment resolution

输出自有 findings 后，若 Step 2.5 分类了 Greptile：

**输出头含 Greptile 摘要：** `+ N Greptile comments (X valid, Y fixed, Z FP)`

回复前运行 greptile-triage.md 的 **Escalation Detection**，选 Tier 1 或 Tier 2 模板。

1. **VALID & ACTIONABLE：** 纳入 findings，走 Fix-First（机械则 auto-fix，否则 batched ASK）（A: Fix now, B: Acknowledge, C: False positive）。A 用 **Fix reply template**（含 inline diff）。C 用 **False Positive template**，写入 per-project 与 global greptile-history。

2. **FALSE POSITIVE：** AskUserQuestion：
   - Greptile 评论：file:line 或 [top-level] + 摘要 + permalink
   - 简明为何为 FP
   - A) 回复 Greptile 说明错误（明显错误时推荐）B) 仍修复（低工作量无害）C) 忽略——不回复不修
   A 用 False Positive template，写入 history。

3. **VALID BUT ALREADY FIXED：** **Already Fixed template**——无需 AskUserQuestion：
   - 做了什么、修复 commit SHA
   - 写入两处 history

4. **SUPPRESSED：** 静默跳过——已知 FP。

---

## Step 5.5: TODOS cross-reference

读仓库根 `TODOS.md`（若存在）。对照 PR 与未完成 TODO：

- **是否关闭未完成 TODO？** 若是，输出："This PR addresses TODO: <title>"
- **是否产生应记入 TODO 的工作？** 若是，informational finding。
- **是否有相关 TODO 提供上下文？** 若是，讨论 findings 时引用。

无 TODOS.md 则静默跳过。

---

## Step 5.6: Documentation staleness check

对照 diff 与文档。对每个根目录 `.md`（README.md、ARCHITECTURE.md、CONTRIBUTING.md、CLAUDE.md 等）：

1. diff 中代码变更是否影响该文档描述的特性、组件或工作流。
2. 若该文档本分支**未**更新，但所述代码**已**变更 → INFORMATIONAL finding：
   "Documentation may be stale: [file] describes [feature/component] but code changed in this branch. Consider running `/document-release`."

仅信息性——永不 critical。修复动作为 `/document-release`。

无文档文件则静默跳过。

---

## Step 5.7: Adversarial review（auto-scaled）

对抗性 review 深度随 diff 大小自动缩放。无需配置。

**检测 diff 大小与工具可用性：**

```bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Respect old opt-out
OLD_CFG=$(~/.claude/skills/gstack/bin/gstack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: ${OLD_CFG:-not_set}"
```

若 `OLD_CFG` 为 `disabled`：静默跳过。继续下一步。

**用户覆盖：** 若用户明确要求某 tier（如 "run all passes"、"paranoid review"、full adversarial、do all 4 passes、thorough review），无视 diff 大小跳到对应 tier。

**按 diff 大小自动选 tier：**
- **Small（<50 行）：** 完全跳过 adversarial。打印："Small diff ($DIFF_TOTAL lines) — adversarial review skipped." 继续。
- **Medium（50–199）：** Codex adversarial challenge（无 Codex 则用 Claude adversarial subagent）。见 Medium tier。
- **Large（200+）：** 剩余全部 pass——Codex structured review + Claude adversarial subagent + Codex adversarial。见 Large tier。

---

### Medium tier（50–199）

Claude structured review 已跑。加 **cross-model adversarial challenge**。

**Codex 可用：** 跑 Codex adversarial。**不可用：** 回退 Claude adversarial subagent。

**Codex adversarial：**

```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

Bash 工具 `timeout` 设为 `300000`（5 分钟）。**不要**用 shell 的 `timeout`——macOS 无。完成后：
```bash
cat "$TMPERR_ADV"
```

原样呈现全文。信息性——永不阻塞 shipping。

**错误处理：** 均不阻塞。
- **鉴权失败：** stderr 含 "auth"、"login"、"unauthorized"、"API key"："Codex authentication failed. Run \`codex login\` to authenticate."
- **超时：** "Codex timed out after 5 minutes."
- **空响应：** "Codex returned no response. Stderr: <paste relevant error>."

任何 Codex 错误自动回退 Claude adversarial subagent。

**Claude adversarial subagent**（Codex 不可用或出错时）：

用 Agent 工具派发。子 agent 无 checklist 偏见——独立视角。

Subagent prompt：
"Read the diff for this branch with `git diff origin/<base>`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments — just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

标题 `ADVERSARIAL REVIEW (Claude subagent):`。**FIXABLE** 进入与 structured review 相同的 Fix-First。**INVESTIGATE** 为信息性。

子 agent 失败或超时："Claude adversarial subagent unavailable. Continuing without adversarial review."

**持久化：**
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"medium","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
STATUS：无 findings 为 "clean"，有为 "issues_found"。SOURCE："codex" 或 "claude"。均失败则不 persist。

**清理：** `rm -f "$TMPERR_ADV"`（若用了 Codex）。

---

### Large tier（200+）

Structured review 已跑。跑 **剩余三路** 最大覆盖：

**1. Codex structured review（若可用）：**
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

`timeout` 300000。标题 `CODEX SAYS (code review):`。
查 `[P1]`：有 → `GATE: FAIL`，无 → `GATE: PASS`。

GATE FAIL 时 AskUserQuestion：
```
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Continue — review will still complete
```

A：处理 findings。重跑 `codex review` 验证。

stderr 错误处理同 medium。之后 `rm -f "$TMPERR"`

**2. Claude adversarial subagent：** 同上 adversarial prompt。无论 Codex 是否可用都跑。

**3. Codex adversarial challenge（若可用）：** 同 medium 的 adversarial `codex exec`。

Codex 在 1 和 3 都不可用则告知："Codex CLI not found — large-diff review ran Claude structured + Claude adversarial (2 of 4 passes). Install Codex for full 4-pass coverage: `npm install -g @openai/codex`"

**全部 pass 完成后** persist（非每子步）：
```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"large","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
STATUS：所有 pass 无 findings 为 "clean"，否则 "issues_found"。SOURCE："both" 或 "claude"。GATE：Codex structured 的 pass/fail，或 Codex 不可用则为 "informational"。全失败则不 persist。

---

### Cross-model synthesis（medium 与 large）

全部完成后汇总：

```
ADVERSARIAL REVIEW SYNTHESIS (auto: TIER, N lines):
════════════════════════════════════════════════════════════
  High confidence (found by multiple sources): [findings agreed on by >1 pass]
  Unique to Claude structured review: [from earlier step]
  Unique to Claude adversarial: [from subagent, if ran]
  Unique to Codex: [from codex adversarial or code review, if ran]
  Models used: Claude structured ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
```

多源一致的高置信 findings 优先修复。

---

## Step 5.8: Persist Eng Review result

全部 review pass 完成后持久化最终 `/review` 结果，供 `/ship` 识别已跑 Eng Review：

```bash
~/.claude/skills/gstack/bin/gstack-review-log '{"skill":"review","timestamp":"TIMESTAMP","status":"STATUS","issues_found":N,"critical":N,"informational":N,"commit":"COMMIT"}'
```

- TIMESTAMP：ISO 8601
- STATUS：Fix-First 与 adversarial 后无未解决 findings 为 `"clean"`，否则 `"issues_found"`
- issues_found：剩余未解决总数
- critical / informational：剩余未解决分级
- COMMIT：`git rev-parse --short HEAD`

若提前退出（如对 base 无 diff），**不要**写此条目。

## Important Rules

- **读完全部 diff 再评论。** 不要标记 diff 已解决的问题。
- **Fix-first，非只读。** AUTO-FIX 直接应用。ASK 仅用户批准后应用。不要 commit、push、创建 PR——那是 /ship。
- **简洁。** 一行问题、一行修复。无冗长前言。
- **只标真问题。** 无问题则跳过。
- **Greptile 回复用 greptile-triage.md 模板。** 每条回复含证据。不要模糊回复。
