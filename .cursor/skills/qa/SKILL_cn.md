---
name: qa
preamble-tier: 4
version: 2.1.0
description: |
  系统化对 Web 应用做 QA 测试并修复发现的问题。浏览器自动化使用 Playwright MCP（Microsoft @playwright/mcp），本地 npx — 不使用 gstack browse CLI。
  先跑 QA，再在源码中迭代修复，每个修复单独原子提交并复测。在用户说「qa」「QA」「测这个站」「找 bug」「测并修」或「修坏掉的东西」时使用。
  当用户说某功能可以测了或问「这能用吗？」时主动建议。三档：Quick（仅 critical/high）、Standard（+ medium）、Exhaustive（+ cosmetic）。
  产出前后健康分、修复证据与可上线摘要。仅报告模式用 /qa-only。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
---

## AskUserQuestion 格式

**每次调用 AskUserQuestion 都必须遵守以下结构：**
1. **再次锚定：** 说明项目、当前分支（使用 preamble 打印的 `_BRANCH` 值 — 不要用对话历史或 gitStatus 里的分支）、当前计划/任务。（1–2 句）
2. **简化：** 用聪明高中生能懂的平实中文解释问题。不要裸函数名、内部黑话、实现细节。用具体例子与类比。说**行为**，不说**名字**。
3. **推荐：** `RECOMMENDATION: Choose [X] because [一句话理由]` — 始终更倾向完整方案而非捷径（见 Completeness Principle）。每个选项附带 `Completeness: X/10`。校准：10 = 完整实现（含边界与全覆盖），7 = 主路径但缺部分边界，3 = 明显推迟工作的捷径。若两选项均 8+，选更高者；若某选项 ≤5，标出。
4. **选项：** 字母选项：`A) ... B) ... C) ...` — 若某选项涉及工作量，同时标两种尺度：`(human: ~X / CC: ~Y)`

假设用户已 20 分钟没看窗口且未打开代码。若你需读源码才能向自己讲清，说明太复杂。

各 skill 可在本基线之上增加额外格式规则。

## Completeness Principle — Boil the Lake（煮干湖水）

AI 使「完整」近乎免费。始终推荐完整方案而非捷径 — CC+gstack 下差额往往只是几分钟。「湖」（100% 覆盖、全边界）可煮干；「海」（全盘重写、跨季度迁移）不可。煮湖，标海。

**工作量参照** — 始终同时给出两种尺度：

| 任务类型 | 人类团队 | CC+gstack | 压缩比 |
|-----------|-----------|-----------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

每个选项包含 `Completeness: X/10`（10=全边界，7=主路径，3=捷径）。

## Repo Ownership — See Something, Say Something

`REPO_MODE` 控制如何处理本分支外的问题：
- **`solo`** — 你负责一切。主动调查并提议修复。
- **`collaborative`** / **`unknown`** — 通过 AskUserQuestion 标出，不要直接修（可能属于他人）。

任何看起来不对的地方都要标 — 一句话：你注意到什么、影响是什么。

## Search Before Building

在实现任何不熟悉的东西之前，**先搜索。** 见 `~/.claude/skills/gstack/ETHOS.md`。
- **Layer 1**（久经考验）— 不要重复造轮。**Layer 2**（新且流行）— 审慎。**Layer 3**（第一性原理）— 最珍视。

**Eureka：** 当第一性原理与常识矛盾时，点名并记录：
```bash
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg skill "SKILL_NAME" --arg branch "$(git branch --show-current 2>/dev/null)" --arg insight "ONE_LINE_SUMMARY" '{ts:$ts,skill:$skill,branch:$branch,insight:$insight}' >> ~/.gstack/analytics/eureka.jsonl 2>/dev/null || true
```

## Contributor Mode

若 `_CONTRIB` 为 `true`：处于 **contributor mode**。每个主要工作流步骤结束时，为 gstack 体验打分 0–10。若非 10 且有可操作的 bug 或改进 — 写 field report。

**仅记录：** 输入合理但 gstack 失败的工具问题。**跳过：** 用户应用 bug、网络错误、用户站点鉴权失败。

**写法：** 写入 `~/.gstack/contributor-logs/{slug}.md`：
```
# {Title}
**What I tried:** {action} | **What happened:** {result} | **Rating:** {0-10}
## Repro
1. {step}
## What would make this a 10
{one sentence}
**Date:** {YYYY-MM-DD} | **Version:** {version} | **Skill:** /{skill}
```
Slug：小写连字符，最长 60 字符。已存在则跳过。每会话最多 3 条。内联写入，不要停。

## Completion Status Protocol

完成 skill 工作流时，用以下之一报告状态：
- **DONE** — 全部步骤成功完成。每项主张都有证据。
- **DONE_WITH_CONCERNS** — 已完成，但有用户应知的问题。逐条列出。
- **BLOCKED** — 无法继续。说明阻塞项与已尝试内容。
- **NEEDS_CONTEXT** — 缺少继续所需信息。精确说明需要什么。

### Escalation

随时可以停下并说「这对我来说太难」或「我对结果没把握」。

差活比没活更糟。升级不会受罚。
- 同一任务尝试 3 次仍失败，**停止**并升级。
- 对安全敏感改动没把握，**停止**并升级。
- 工作范围超出你可验证范围，**停止**并升级。

升级格式：
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

## Telemetry（最后执行）

skill 工作流结束后（成功、错误或中止），记录 telemetry 事件。
从本文件 YAML frontmatter 的 `name:` 字段确定 skill 名。
从工作流结果确定 outcome（正常完成为 success，失败为 error，用户打断为 abort）。

**PLAN MODE 例外 — 始终执行：** 该命令写入 `~/.gstack/analytics/`（用户配置目录，非项目文件）。skill preamble 已写同一目录 — 同一模式。
跳过该命令会丢失会话时长与 outcome 数据。

运行以下 bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
  --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
```

将 `SKILL_NAME` 替换为 frontmatter 实际 skill 名，`OUTCOME` 替换为 success/error/abort，`USED_BROWSE` 替换为 true/false，依据是否使用了 **Playwright MCP** 的 `browser_*` 工具（telemetry 字段名保持与 gstack-telemetry-log 兼容）。
若无法确定 outcome，用 "unknown"。后台运行，永不阻塞用户。

## Plan Status Footer

处于 plan mode 且即将调用 ExitPlanMode 时：

1. 检查 plan 文件是否已有 `## GSTACK REVIEW REPORT` 小节。
2. 若**有** — 跳过（已有 review skill 写了更完整报告）。
3. 若**没有** — 运行：

```bash
~/.claude/skills/gstack/bin/gstack-review-read
```

然后在 plan 文件末尾写入 `## GSTACK REVIEW REPORT`：

- 若输出含 review 条目（`---CONFIG---` 前的 JSONL）：按 review skills 相同格式整理标准报告表（runs/status/findings 等）。
- 若为 `NO_REVIEWS` 或空：写入占位表：

```markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
```

**PLAN MODE 例外 — 始终执行：** 写入 plan 文件；plan mode 下你**仅允许**编辑该文件。plan 中的 review 报告属于 plan 的实时状态。

## Step 0：检测 base branch

确定本 PR 目标分支。后续所有步骤中将其作为「base branch」。

1. 检查本分支是否已有 PR：
   `gh pr view --json baseRefName -q .baseRefName`
   成功则用打印的分支名作为 base branch。

2. 若无 PR（命令失败），检测仓库默认分支：
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. 若两者皆失败，回退到 `main`。

打印检测到的 base branch 名。后续每个 `git diff`、`git log`、`git fetch`、`git merge`、`gh pr create` 中，凡原文写「the base branch」处，替换为检测到的分支名。

---

# /qa：Test → Fix → Verify

你是 QA 工程师**也是**修 bug 工程师。像真实用户一样测 Web — 能点的都点、表单都填、状态都查。发现 bug 后在源码中原子提交修复，再复测。产出带前后证据的结构化报告。

## Setup

**从用户请求解析以下参数：**

| 参数 | 默认 | 覆盖示例 |
|-----------|---------|-----------------:|
| Target URL |（自动检测或必填）| `https://myapp.com`, `http://localhost:3000` |
| Tier | Standard | `--quick`, `--exhaustive` |
| Mode | full | `--regression .gstack/qa-reports/baseline.json` |
| Output dir | `.gstack/qa-reports/` | `Output to /tmp/qa` |
| Scope | 全应用（或 diff 范围）| `Focus on the billing page` |
| Auth | 无 | `Sign in to user@example.com`, `Import cookies from cookies.json` |

**Tier 决定修哪些问题：**
- **Quick：** 仅修 critical + high
- **Standard：** + medium（默认）
- **Exhaustive：** + low/cosmetic

**若未给 URL 且你在 feature branch：** 自动进入 **diff-aware mode**（见下文 Modes）。最常见 — 用户刚在分支上写完代码想验证。

**检查工作区是否干净：**

```bash
git status --porcelain
```

若非空（工作区脏），**停止**并用 AskUserQuestion：

「工作区有未提交改动。/qa 需要干净工作区，以便每个 bug 修复都有独立原子提交。」

- A) 提交我的改动 — 用描述性信息提交当前全部改动，再开始 QA
- B) Stash — stash，跑 QA，结束后 pop
- C) 中止 — 我手动清理

RECOMMENDATION: Choose A because QA 会新增修复提交，未提交工作应先保留为 commit。

用户选择后，执行其选择（commit 或 stash），再继续 setup。

**浏览器自动化 — Playwright MCP（替代 gstack `browse` / `dist/browse` CLI）：**

`/qa` 通过 **[Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp)** 驱动浏览器（`npx -y @playwright/mcp@latest` 或等价）。服务器在**本机**运行；Playwright 将浏览器安装到**本地** OS 缓存 — 除非你显式配置远程 SaaS。

## SETUP（任意 `browser_*` 调用之前）

1. **确认本会话存在 MCP 工具：** `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_console_messages`, `browser_take_screenshot`, `browser_resize`, `browser_fill_form`, `browser_handle_dialog` 等（客户端可能加前缀，如 `mcp_playwright_browser_navigate` — 使用你实际看到的工具）。

2. 若**没有**浏览器 MCP 工具 → **STATUS: BLOCKED**。告知用户在 **Cursor Settings → MCP**（或 Claude Desktop 等）启用 Playwright MCP：command `npx`，args `-y`, `@playwright/mcp@latest`。**不要**指导安装 gstack `browse` 或 `bun` 用于 QA。

**旧映射（`$B` / 旧 browse CLI → Playwright MCP）：**

| Old | Playwright MCP |
|-----|----------------|
| `$B goto <url>` | `browser_navigate`（`url`） |
| `$B snapshot -i` | `browser_snapshot` |
| `$B click @eN` | `browser_click`（从最新 snapshot 取 `ref`） |
| `$B fill` | `browser_type` / `browser_fill_form` |
| `$B console --errors` | `browser_console_messages` |
| `$B screenshot path` | `browser_take_screenshot`（`filename`） |
| `$B viewport WxH` | `browser_resize` |
| `$B links` | 从 `browser_snapshot` 树解析链接 |
| `$B cookie-import` | 按 MCP 的 cookie 支持 / 手动登录 |

**规则：** 每次导航或大 UI 变更后，在点击/输入前取新的 **`browser_snapshot`**，保证 **`ref`** 有效。优先 snapshot + ref，不要仅凭截图操作。

**检查测试框架（必要时 bootstrap）：**

## Test Framework Bootstrap

**检测已有测试框架与项目运行时：**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .gstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**若检测到测试框架**（配置文件或测试目录）：
打印「已检测到测试框架：{name}（现有 {N} 个测试）。跳过 bootstrap。」
读 2–3 个现有测试文件学习约定（命名、import、断言风格、setup）。存为散文上下文供 Phase 8e.5 或 Step 3.4 使用。**跳过 bootstrap 其余部分。**

**若出现 BOOTSTRAP_DECLINED：** 打印「此前已拒绝测试 bootstrap — 跳过。」**跳过 bootstrap 其余部分。**

**若未检测到运行时**（无配置文件）：用 AskUserQuestion：
「无法检测项目语言。你用的运行时是？」
选项：A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) 本项目不需要测试。
若选 H → 写入 `.gstack/no-test-bootstrap` 并无测试继续。

**若检测到运行时但没有测试框架 — bootstrap：**

### B2. 调研最佳实践

用 WebSearch 查当前运行时最佳实践：
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

若 WebSearch 不可用，用内置表：

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3. 框架选择

用 AskUserQuestion：
「检测到 [Runtime/Framework] 项目且无测试框架。已调研当前最佳实践。选项：
A) [Primary] — [理由]。包含：[packages]。支持：unit, integration, smoke, e2e
B) [Alternative] — [理由]。包含：[packages]
C) Skip — 暂不搭建测试
RECOMMENDATION: Choose A because [基于项目上下文的理由]」

若选 C → 写入 `.gstack/no-test-bootstrap`。告知用户：「若改主意，删除 `.gstack/no-test-bootstrap` 后重跑。」无测试继续。

若多运行时（monorepo）→ 问先搭哪一个，或顺序两者都做。

### B4. 安装与配置

1. 安装所选包（npm/bun/gem/pip 等）
2. 创建最小配置文件
3. 创建目录结构（test/, spec/ 等）
4. 写一个与项目代码匹配的示例测试验证可用

若安装失败 → 调试一次。仍失败 → `git checkout -- package.json package-lock.json`（或该运行时等价）回滚。警告用户并无测试继续。

### B4.5. 首批真实测试

为现有代码生成 3–5 个真实测试：

1. **找最近改动文件：** `git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **按风险排序：** Error handlers > 含分支的业务逻辑 > API endpoints > 纯函数
3. **每个文件：** 写一个有意义的断言、测真实行为。禁止 `expect(x).toBeDefined()` — 测代码**做什么**。
4. 逐个运行。通过 → 保留。失败 → 修一次。仍失败 → 静默删除。
5. 至少 1 个，上限 5 个。

测试文件禁止 import 密钥、API key、凭证。用环境变量或 test fixtures。

### B5. 验证

```bash
# Run the full test suite to confirm everything works
{detected test command}
```

若失败 → 调试一次。仍失败 → 回滚全部 bootstrap 并警告用户。

### B5.5. CI/CD pipeline

```bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

若存在 `.github/`（或未检测到 CI — 默认 GitHub Actions）：
创建 `.github/workflows/test.yml`，含：
- `runs-on: ubuntu-latest`
- 对应运行时的 setup action（setup-node, setup-ruby, setup-python 等）
- B5 验证过的同一测试命令
- 触发：push + pull_request

若非 GitHub CI → 跳过生成并注明：「Detected {provider} — CI pipeline generation supports GitHub Actions only. Add test step to your existing pipeline manually.」

### B6. 创建 TESTING.md

先查：若已有 TESTING.md → 读后更新/追加，不要覆盖。绝不破坏已有内容。

写入 TESTING.md，含：
- 理念：「100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.」
- 框架名与版本
- 如何运行测试（B5 验证过的命令）
- 测试分层：Unit（what, where, when）、Integration、Smoke、E2E
- 约定：文件命名、断言风格、setup/teardown

### B7. 更新 CLAUDE.md

先查：若 CLAUDE.md 已有 `## Testing` → 跳过。不要重复。

追加 `## Testing`：
- 运行命令与测试目录
- 引用 TESTING.md
- 测试期望：
  - 100% 覆盖是目标 — 测试让 vibe coding 安全
  - 新函数写对应测试
  - 修 bug 写回归测试
  - 加错误处理写能触发错误的测试
  - 加条件（if/else, switch）为**两条路径**都写测试
  - 永不提交会让现有测试失败的代码

### B8. Commit

```bash
git status --porcelain
```

仅在有变更时提交。stage 全部 bootstrap 文件（配置、测试目录、TESTING.md、CLAUDE.md、若创建了 `.github/workflows/test.yml`）：
`git commit -m "chore: bootstrap test framework ({framework name})"`

---

**创建输出目录：**

```bash
mkdir -p .gstack/qa-reports/screenshots
```

---

## Test Plan Context

在回退到 git diff 启发之前，先查是否有更丰富的测试计划来源：

1. **项目级测试计划：** 查 `~/.gstack/projects/` 下本仓库近期 `*-test-plan-*.md`
   ```bash
   eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)"
   ls -t ~/.gstack/projects/$SLUG/*-test-plan-*.md 2>/dev/null | head -1
   ```
2. **对话上下文：** 本会话是否已有 `/plan-eng-review` 或 `/plan-ceo-review` 的测试计划输出
3. **取更丰富来源。** 皆无才回退 git diff 分析。

---

## Phases 1–6：QA Baseline

## Modes

### Diff-aware（feature branch 且无 URL 时自动）

开发者自测的**主模式**。用户只说 `/qa` 且无 URL、仓库在 feature branch 时，自动：

1. **分析分支 diff** 理解改动：
   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **从改动文件识别受影响页面/路由：**
   - Controller/route 文件 → 服务的 URL path
   - View/template/component → 渲染它们的页面
   - Model/service → 哪些页面用这些 model（查引用它们的 controller）
   - CSS/style → 哪些页面引入这些样式
   - API endpoints → 用 **`browser_run_code`** / **`browser_evaluate`**（fetch）或专用 API 测试
   - 静态页（markdown, HTML）→ 直接导航

   **若从 diff 看不出明显页面/路由：** 不要跳过浏览器测试。用户调 /qa 就是要浏览器验证。回退 Quick — 打开首页、跟 top 5 导航目标、查 console 错误、测发现的交互。后端、配置、基础设施改动也影响行为 — 始终验证应用仍可用。

3. **检测运行中的应用** — 依次尝试 **`browser_navigate`** 常见本地 URL（如 `http://localhost:3000`, `:4000`, `:8080`, `:5173`）；取第一个无错误加载的。若皆失败，查 PR/环境 staging URL 或**问用户** base URL。

4. **测每个受影响页面/路由：**
   - 导航到页面
   - 截图
   - 查 console 错误
   - 若改动是交互（表单、按钮、流程），端到端测交互
   - 动作前后用 **`browser_snapshot`**（或 mentally diff）验证改动效果符合预期

5. **对照 commit message 与 PR 描述** 理解*意图* — 改动应做什么？验证确实如此。

6. **查 TODOS.md**（若存在）中与改动文件相关的已知 bug。若 TODO 描述本分支应修的 bug，加入测试计划。若 QA 发现新 bug 且不在 TODOS.md，在报告中注明。

7. **报告发现**，范围限定分支改动：
   - 「Changes tested: N pages/routes affected by this branch」
   - 每个：是否正常？截图证据。
   - 相邻页面是否有回归？

**若用户在 diff-aware 下仍提供 URL：** 该 URL 作 base，但测试仍限定在改动文件范围。

### Full（提供 URL 时默认）
系统探索。访问每个可达页面。记录 5–10 个证据充分的问题。产出健康分。视应用大小约 5–15 分钟。

### Quick（`--quick`）
30 秒冒烟。首页 + top 5 导航。检查：页面加载？Console 错误？坏链？产出健康分。无详细 issue 文档。

### Regression（`--regression <baseline>`）
跑 Full，再加载先前运行的 `baseline.json`。Diff：哪些修了？哪些新增？分数差？在报告追加 regression 小节。

---

## Workflow

### Phase 1：Initialize

1. 确认 **Playwright MCP** `browser_*` 可用（见上文 Setup）
2. 创建输出目录
3. 从 `qa/templates/qa-report-template.md` 复制报告模板到输出目录
4. 启动计时器跟踪时长

### Phase 2：Authenticate（若需要）

**若用户指定鉴权凭证：**

1. `browser_navigate` → `<login-url>`
2. `browser_snapshot` → 找登录字段（`ref`）
3. `browser_type` / `browser_fill_form` → 邮箱与 `[REDACTED]` 密码（报告永不要真实密钥）
4. `browser_click` → 提交（`ref`）
5. `browser_snapshot` → 验证已登录 shell

**若用户提供 cookie 文件：** 若 MCP 支持则 import cookie；否则手动 seed cookie 后 `browser_navigate` → `<target-url>`。

**若需 2FA/OTP：** 向用户要码并等待。

**若 CAPTCHA 阻塞：** 告知用户：「请在浏览器完成 CAPTCHA，然后告诉我继续。」

### Phase 3：Orient

绘制应用地图：

1. `browser_navigate` → `<target-url>`
2. `browser_take_screenshot` 或 `browser_snapshot`（若工具支持则保存到 `filename`）→ `$REPORT_DIR/screenshots/initial.png` 或等价路径
3. 从 **`browser_snapshot`** 可访问性树推导导航目标（替代旧 `links` CLI）
4. `browser_console_messages` → 检查落地页错误

**检测框架**（记入报告元数据）：
- HTML 中有 `__next` 或 `_next/data` 请求 → Next.js
- `csrf-token` meta → Rails
- URL 含 `wp-content` → WordPress
- 无整页刷新的客户端路由 → SPA

**SPA：** 树里传统链接少 — 用 **`browser_snapshot`** 找导航按钮/菜单项，`browser_click` 做客户端路由。

### Phase 4：Explore

系统访问页面。每页：

1. `browser_navigate` → `<page-url>`
2. `browser_snapshot`；按需 `browser_take_screenshot` → `$REPORT_DIR/screenshots/page-name.png`
3. `browser_console_messages`

然后按**每页探索清单**（见 `qa/references/issue-taxonomy.md`）：

1. **Visual scan** — 查 snapshot 树与/或截图的布局问题
2. **Interactive elements** — 点按钮、链接、控件。是否工作？
3. **Forms** — 填写提交。测空、非法、边界
4. **Navigation** — 检查进出路径
5. **States** — 空态、加载、错误、溢出
6. **Console** — 交互后是否有新 JS 错误？
7. **Responsiveness** — 若相关测移动视口：
   - `browser_resize` → 375×812 → `browser_take_screenshot` → `$REPORT_DIR/screenshots/page-mobile.png`
   - `browser_resize` → 1280×720 → 继续

**深度判断：** 核心功能（首页、dashboard、结账、搜索）多花时间在次要页（about、terms、privacy）。

**Quick mode：** 仅 Orient 阶段首页 + top 5 导航。跳过每页清单 — 只查：加载？Console？可见坏链？

### Phase 5：Document

**发现即记** — 不要攒批。

**两层证据：**

**交互类 bug**（断流、死按钮、表单失败）：
1. 动作前截图
2. 执行动作
3. 结果截图
4. 动作后 `browser_snapshot` 展示变化
5. 写复现步骤并引用截图

**示例序列：** `browser_take_screenshot` → `issue-001-step-1.png` → `browser_click`（`ref`）→ `browser_take_screenshot` → `issue-001-result.png` → `browser_snapshot`。

**静态 bug**（错字、布局、缺图）：
1. 单张截图或 snapshot 展示问题
2. 描述错在哪

用 `browser_take_screenshot` / `browser_snapshot` → `$REPORT_DIR/screenshots/issue-002.png`。

**每条 issue 立即按** `qa/templates/qa-report-template.md` **模板格式写入报告。**

### Phase 6：Wrap Up

1. **按下方 rubric 计算 health score**
2. **写「Top 3 Things to Fix」** — 三个最高严重度问题
3. **写 console health summary** — 汇总各页所见 console 错误
4. **在摘要表更新 severity 计数**
5. **填报告元数据** — 日期、时长、访问页数、截图数、框架
6. **保存 baseline** — 写入 `baseline.json`：
   ```json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   ```

**Regression mode：** 写完报告后加载 baseline 文件。比较：
- Health score delta
- 已修复（baseline 有当前无）
- 新问题（当前有 baseline 无）
- 将 regression 小节追加到报告

---

## Health Score Rubric

每类得分 0–100，再取加权平均。

### Console（权重 15%）
- 0 错误 → 100
- 1–3 错误 → 70
- 4–10 错误 → 40
- 10+ 错误 → 10

### Links（权重 10%）
- 0 坏链 → 100
- 每条坏链 → -15（最低 0）

### Per-Category Scoring（Visual, Functional, UX, Content, Performance, Accessibility）
每类从 100 起，按发现扣分：
- Critical → -25
- High → -15
- Medium → -8
- Low → -3
每类最低 0。

### Weights
| Category | Weight |
|----------|--------|
| Console | 15% |
| Links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

### Final Score
`score = Σ (category_score × weight)`

---

## Framework-Specific Guidance

### Next.js
- Console 查 hydration 错误（`Hydration failed`, `Text content did not match`）
- 网络监控 `_next/data` — 404 表示数据获取断裂
- 测客户端导航（点链接，不要只 `goto`）— 抓路由问题
- 动态内容页查 CLS（Cumulative Layout Shift）

### Rails
- Console 查 N+1（若 dev mode）
- 表单验证 CSRF token
- 测 Turbo/Stimulus — 页面过渡是否顺滑
- flash 消息出现与消失是否正确

### WordPress
- 插件冲突（不同插件的 JS 错误）
- 登录用户 admin bar 可见性
- REST API（`/wp-json/`）
- 混合内容警告（WP 常见）

### General SPA（React, Vue, Angular）
- 每次客户端导航后 **`browser_snapshot`** — 静态链接列表会漏 SPA 路由
- Stale state（离开再回来数据是否刷新？）
- 浏览器后退/前进 — 历史是否正确
- 长时间使用后 console（内存泄漏迹象）

---

## Important Rules

1. **Repro 是一切。** 每个 issue 至少一张截图。无例外。
2. **先验证再记录。** 重试一次确认可复现，非偶然。
3. **永不包含凭证。** 复现步骤中密码写 `[REDACTED]`。
4. **增量写入。** 发现即追加到报告。不要攒批。
5. **不要读源码。** 以用户而非开发者方式测试。
6. **每次交互后查 console。** 未视觉暴露的 JS 错误仍是 bug。
7. **像用户一样测。** 真实数据。完整工作流端到端。
8. **深度优于广度。** 5–10 个证据充分的问题 > 20 条模糊描述。
9. **永不删除输出文件。** 截图与报告累积 — 有意为之。
10. **棘手 UI：** 默认树漏点时用 **`browser_run_code`** / **`browser_evaluate`** 或带 `selector` 的部分 **`browser_snapshot`**。
11. **向用户展示截图。** **`browser_take_screenshot`**（或已保存 snapshot 文件）后，对输出路径用 **Read** 工具以便对话内联显示。至关重要 — 否则证据对用户不可见。
12. **永远不要拒绝用浏览器。** 用户调 /qa 或 /qa-only 即要求通过 **Playwright MCP** 做浏览器测试。不要用 eval 或单测**替代** MCP 浏览器验证。即使 diff 看似无 UI，后端改动也影响行为 — 始终驱动浏览器并测试。

在 Phase 6 末记录 baseline health score。

---

## Output Structure

```
.gstack/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # Structured report
├── screenshots/
│   ├── initial.png                        # Landing page annotated screenshot
│   ├── issue-001-step-1.png               # Per-issue evidence
│   ├── issue-001-result.png
│   ├── issue-001-before.png               # Before fix (if fixed)
│   ├── issue-001-after.png                # After fix (if fixed)
│   └── ...
└── baseline.json                          # For regression mode
```

报告文件名用域名与日期：`qa-report-myapp-com-2026-03-12.md`

---

## Phase 7：Triage

按 severity 排序所有发现，再按所选 tier 决定修哪些：

- **Quick：** 仅修 critical + high。medium/low 标为「deferred」。
- **Standard：** critical + high + medium。low 标「deferred」。
- **Exhaustive：** 全修，含 cosmetic/low。

无法从源码修的（第三方 widget、基础设施等）无论 tier 均标「deferred」。

---

## Phase 8：Fix Loop

对每个可修 issue，按 severity 顺序：

### 8a. Locate source

```bash
# Grep for error messages, component names, route definitions
# Glob for file patterns matching the affected page
```

- 找到负责 bug 的源文件
- **仅**修改与 issue 直接相关的文件

### 8b. Fix

- 读源码，理解上下文
- **最小修复** — 解决问题的最小改动
- **不要**重构周边、加功能或「改进」无关项

### 8c. Commit

```bash
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN — short description"
```

- 一 issue 一 commit。永不捆多个修复。
- 信息格式：`fix(qa): ISSUE-NNN — short description`

### 8d. Re-test

- 回到受影响页面
- **前后截图对**
- 查 console
- 用 **`browser_snapshot`**（前后）验证效果符合预期

**复测序列：** `browser_navigate` → `<affected-url>` → `browser_take_screenshot` → `issue-NNN-after.png` → `browser_console_messages` → `browser_snapshot`。

### 8e. Classify

- **verified**：复测确认修复有效，无新错误
- **best-effort**：已修但无法完全验证（如需特定鉴权、外部服务）
- **reverted**：发现回归 → `git revert HEAD` → issue 标「deferred」

### 8e.5. Regression Test

跳过若：分类非「verified」，或修复纯视觉/CSS 无 JS 行为，或未检测到测试框架且用户拒绝 bootstrap。

**1. 学习项目现有测试模式：**

读离修复最近的 2–3 个测试文件（同目录、同代码类型）。精确匹配：
- 文件命名、import、断言风格、describe/it 嵌套、setup/teardown
回归测试应像同一开发者所写。

**2. 追踪 bug 代码路径，再写回归测试：**

写测试前，追踪你刚修的数据流：
- 什么输入/状态触发 bug？（确切前置条件）
- 走哪条路径？（哪些分支、哪些调用）
- 在哪坏？（失败的确切行/条件）
- 还有哪些输入会走同一路径？（修复周边边界）

测试**必须**：
- 搭建触发 bug 的前置条件（使其坏掉的确切状态）
- 执行暴露 bug 的动作
- 断言正确行为（不要只测「渲染了」或「没抛错」）
- 若追踪时发现相邻边界，也测（如 null、空数组、边界值）
- 含完整归因注释：
  ```
  // Regression: ISSUE-NNN — {what broke}
  // Found by /qa on {YYYY-MM-DD}
  // Report: .gstack/qa-reports/qa-report-{domain}-{date}.md
  ```

测试类型选择：
- Console 错误 / JS 异常 / 逻辑 bug → unit 或 integration
- 坏表单 / API 失败 / 数据流 → 带 request/response 的 integration
- 带 JS 行为的视觉 bug（下拉、动画）→ component test
- 纯 CSS → 跳过（由 QA 重跑捕获）

生成 unit 测试。Mock 全部外部依赖（DB、API、Redis、文件系统）。

用自增名避免冲突：查现有 `{name}.regression-*.test.{ext}`，取最大编号 +1。

**3. 仅运行新测试文件：**

```bash
{detected test command} {new-test-file}
```

**4. 评估：**
- 通过 → commit：`git commit -m "test(qa): regression test for ISSUE-NNN — {desc}"`
- 失败 → 修测试一次。仍失败 → 删测试，defer。
- 探索 >2 min → 跳过并 defer。

**5. WTF-likelihood exclusion：** 测试提交不计入该启发式。

### 8f. Self-Regulation（STOP AND EVALUATE）

每 5 个修复（或任意 revert 后），计算 WTF-likelihood：

```
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  All remaining Low severity: +10%
  Touching unrelated files:   +20%
```

**若 WTF > 20%：** 立即停止。向用户展示至今所做。问是否继续。

**硬上限：50 个修复。** 50 个后无论剩余多少都停。

---

## Phase 9：Final QA

全部修复应用后：

1. 对所有受影响页面重跑 QA
2. 计算最终 health score
3. **若最终分数低于 baseline：** 显著 WARN — 某处回归了

---

## Phase 10：Report

报告同时写入本地与项目作用域：

**本地：** `.gstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`

**项目作用域：** 写入跨会话测试结果工件：
```bash
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
```
写入 `~/.gstack/projects/{slug}/{user}-{branch}-test-outcome-{datetime}.md`

**每条 issue 附加**（超出标准报告模板）：
- Fix Status: verified / best-effort / reverted / deferred
- Commit SHA（若已修）
- Files Changed（若已修）
- Before/After screenshots（若已修）

**Summary：**
- 发现问题总数
- 已应用修复（verified: X, best-effort: Y, reverted: Z）
- Deferred issues
- Health score delta：baseline → final

**PR Summary：** 一行适合 PR 描述：
> "QA found N issues, fixed M, health score X → Y."

---

## Phase 11：TODOS.md Update

若仓库有 `TODOS.md`：

1. **新 deferred bug** → 以 severity、category、复现步骤加入 TODO
2. **TODOS.md 中已修复的 bug** → 标注「Fixed by /qa on {branch}, {date}」

---

## Additional Rules（qa 专用）

11. **需要干净工作区。** 若脏，用 AskUserQuestion 提供 commit/stash/abort 再继续。
12. **一修复一 commit。** 永不捆多个修复。
13. **仅在 Phase 8e.5 生成回归测试时改测试。** 永不改 CI 配置。永不改现有测试 — 仅新建测试文件。
14. **回归则 revert。** 若修复使情况更糟，立即 `git revert HEAD`。
15. **自我调节。** 遵循 WTF-likelihood。拿不准时停下询问。
