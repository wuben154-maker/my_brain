# Reference — spec acceptance review (lite)

---

## Spec 发现顺序

1. 用户给的路径 / id / slug
2. `spec-graph.json` → `specPath`
3. `docs/specs/**/{ID}.md`
4. `docs/Process/<slug>/acceptance*.md`
5. `plan.md` 里 `PR-NN` 段落
6. 分支名启发（`feat/*-aw-01` → `AW-01`）

---

## Spec 解析要点

- `- [ ] **AC-01**` → 标准定义，非完成状态
- `## PR 独立性` → diff 基准用 `origin/main`
- `## 范围` / `## 验收标准` / `## Verify`

---

## Diff 基准

1. spec 写明独立 PR / `origin/main`
2. 用户参数 `against origin/...`
3. `config.json` → `integrationBranch`
4. `pr-commit-with-review` → `PR_BASE`
5. `origin/HEAD` 或 `origin/main`

```bash
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

---

## Scoped verify（lite 核心减负）

**目的：** 细粒度 spec 不要每次都跑全 monorepo。

### 1. 从 spec 读取 Verify 块

按行拆分 shell 命令。

### 2. 按 diff 路径过滤

| diff 特征 | 跑 | 跳过（lite） |
|-----------|-----|--------------|
| 仅 `web/` | `cd web && npm test`, `tsc`, `build` | `go test ./...`（除非 spec 强制全量） |
| 仅 `*.go` 或 `internal/` | `go test` 相关包路径, `go vet`, `go build` | web 命令 |
| `web/` + go | spec 块内与两边相关的命令 | 无关子命令 |
| 仅 `docs/` | 无命令或 `markdown lint` 若存在 | 全部编译测试 |

### 3. Go 包收窄

diff 含 `internal/agent/foo.go` → 优先 `go test ./internal/agent/...`，而非 `go test ./...`。

### 4. spec 无 Verify

跑 **一条** 最相关命令（不要跑完整 fallback 表）：

- go 改动 → `go test <nearest package>`
- web 改动 → `cd web && npx tsc --noEmit`
- 不确定 → `config.json` → `defaultTestCommands[0]`

### 5. full 档 / `verifyMode: spec-full`

跑 spec Verify **全部**行，不过滤。

### config `verifyMode`

| 值 | 行为 |
|----|------|
| `scoped`（默认） | 按 diff 过滤 |
| `spec-full` | spec 块全跑 |
| `full-fallback` | spec 块 + 项目默认全套（最重，仅用户明确要求） |

---

## 漂移判定（lite）

- 从 spec **范围** + AC 提及路径推断允许改动
- 无 touch list 时 **从窄推断** — 不确定标漂移
- 输出：**只列漂移文件**，合格时不列 in-scope

---

## 契约（lite）

仅当 spec 含 `Depends on` / `Provides` / 契约文件链接 → 快速核对 Provides 是否存在于代码。  
否则 **跳过**，不写进用户输出。

---

## 落盘（仅 full 模式）

用户说 `落盘` / `full` 时可选写入：

- `docs/specs/<wave>/reviews/<ID>-review.md`
- `docs/Process/_reviews/<ID>-<date>.md`

默认 **不落盘**。
