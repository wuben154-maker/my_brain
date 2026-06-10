---
name: spec-acceptance-review
version: 1.2.0
description: |
  细粒度 spec 实现后的轻量验收：范围漂移、scoped 验证、AC 核对、契约与关键代码审查。
  默认只输出简短合格/不合格结论，不生成长报告。用于「spec 验收」「防跑偏」「spec verify」。
disable-model-invocation: true
---

# Spec 验收审查（轻量版）

> 每个小 spec（如 AW-01）做完后快速把关。**默认 lite**：快、话少、不写长 md。

**开场一句：** 正在对 `{spec-id}` 做 spec 验收（lite）。

---

## 黄金规则

| ID | 规则 |
|----|------|
| **GR-BRIEF** | **默认只输出** [_templates/OUTPUT-BRIEF.md](_templates/OUTPUT-BRIEF.md) 格式（约 15 行）。禁止输出冗长报告；禁止默认落盘。用户说 `full` / `详细报告` / `落盘` 时才写完整报告。 |
| **GR-LITE** | 默认 **micro** 档。不跑整站 `/qa`、不跑 `/design-review`、不走 `delivery-pipeline`。 |
| **GR-READONLY** | 默认只审不改；用户说 `修复` / `fix findings` 才可改代码。 |
| **GR-ORDER** | 先跑验证命令，再给**行为类** AC 判合格。 |
| **GR-CHECKBOX** | spec 里 `- [ ] **AC-01**` 是**标准定义**，不是「已勾选完成」。 |
| **GR-SCOPED-VERIFY** | lite 下按 **diff 范围** 跑 Verify 子集，避免每个小 spec 都全量 `go test ./...` + 全量 web build。见 [reference.md](reference.md)。 |
| **GR-SECRETS** | 输出里不出现密钥、`.env` 内容。 |

---

## 档位

| 档位 | 何时 | 做什么 |
|------|------|--------|
| **micro**（默认） | 细粒度 spec，通常 ≤5 条 AC、小 PR | scoped 验证 + AC + 漂移 + 关键安全问题 |
| **full** | 用户要求 `full` / `详细`，或 AC>8、跨契约 | spec 内 Verify 全跑 + 契约核对 + review Pass 1 |

未说明时一律 **micro**。

---

## 轻量流程（4 步）

内部做完 1–3 步，**第 4 步只给用户看简短结论**。

### 1. 加载

- 读 spec（路径 / id / slug）— 见 [reference.md](reference.md)
- diff 基准：spec 写 **PR 独立性** → `origin/main`；否则项目默认集成分支
- `git diff --stat <base>...HEAD`（工作区脏则含未提交）

### 2. Scoped 验证

1. 读 spec 底部 **Verify** 代码块
2. **按 diff 过滤**（见 reference）— 只跑与本次改动相关的命令
3. spec 无 Verify：跑 **一条** 最相关命令，不跑整张 fallback 表
4. 任一必需命令 exit ≠ 0 → **不合格**

**lite 下禁止：** 拉起完整 `/qa`、完整 `/design-review`。UI 类 AC 只做：相关单测 / 一次定向 MCP 检查。

### 3. 内部核对（不展开给用户）

- **AC：** 每条 → 合格/不合格 + 一句话依据
- **漂移：** 只记 **超出 spec 范围** 的文件（合格时不列 in-scope 清单）
- **契约：** 仅当 spec 写明 Depends/Provides 或契约路径；否则跳过
- **代码：** 只看 diff 的 **Critical/High**（安全、并发、LLM 边界、数据安全）；忽略风格

### 4. 输出（唯一默认交付物）

严格按 [_templates/OUTPUT-BRIEF.md](_templates/OUTPUT-BRIEF.md) 回复。

**合格条件（全部满足）：** 所有 AC 合格；验证通过；无漂移；无 Critical/High 问题。

---

## 合格判定

| 内部 | 对用户说 |
|------|----------|
| 全部满足 | **合格** |
| AC/验证/安全问题 | **不合格** |
| 有范围外改动 | **不合格**（写明漂移文件） |
| 缺环境、测不了 | **阻塞** |

**不合格时：** 只列失败项，每项一行，带 `AC-xx` / 命令 / 文件路径。  
**合格时：** 3–5 行即可，不列通过的 AC 明细。

---

## 用法

```
/spec-acceptance-review AW-01
/spec-acceptance-review docs/specs/agent-web-completion/AW-01.md
验收 AW-02，report only
AW-03 详细报告并落盘    # 才走 full + 写文件
```

---

## 与其它 skill 的关系

| 本 skill | 不是 |
|----------|------|
| 每个小 spec 做完后 30 秒级把关 | `plan-*-review`（动手前审方案） |
| 简短合格/不合格 | `delivery-pipeline`（整条功能交付） |
| scoped 验证 | 整站 QA |

合格后 → `pr-commit-with-review` 或人工合并。

---

## 配置

可选 `.cursor/skills/spec-acceptance-review/config.json`，见 [config.example.json](config.example.json)。

---

## 附录

- [reference.md](reference.md) — spec 发现、diff 基准、scoped verify 规则
- [examples.md](examples.md) — 输出示例
- [_templates/OUTPUT-BRIEF.md](_templates/OUTPUT-BRIEF.md) — 默认输出模板
- [_templates/REPORT-FULL.md](_templates/REPORT-FULL.md) — 仅 full/落盘时用
