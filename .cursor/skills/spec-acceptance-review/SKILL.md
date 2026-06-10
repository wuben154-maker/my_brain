---
name: spec-acceptance-review
version: 1.2.0
description: |
  Lightweight post-spec acceptance gate for fine-grained specs: scoped verify, AC check,
  drift scan, and critical code review. Default output is a brief pass/fail summary in chat
  (not a long report). Cross-project. Use after each small spec/PR, when the user says
  "spec verify", "spec 验收", "防跑偏", or "acceptance review".
disable-model-invocation: true
---

# Spec acceptance review (lite)

> Post-build gate for **fine-grained specs** (e.g. AW-01, AW-02). Default mode is **lite** — fast, chat-only summary.

**Start:** `spec-acceptance-review` · mode **lite** (unless user says `full` / `详细报告`).

**Primary doc (中文):** [SKILL_cn.md](SKILL_cn.md)

---

## Golden rules

| ID | Rule |
|----|------|
| **GR-BRIEF** | **Default output** = [_templates/OUTPUT-BRIEF.md](_templates/OUTPUT-BRIEF.md) only (~15 lines). **No** long markdown report, **no** disk file unless user asks `full` / `落盘`. |
| **GR-LITE** | Default tier = **micro**. Do not run full-repo QA, design-review, or delivery-pipeline. |
| **GR-READONLY** | Do not edit code unless user says `fix findings`. |
| **GR-ORDER** | Run verify before marking **behavioral** AC pass. |
| **GR-CHECKBOX** | `- [ ]` in spec = criterion definition, not done/not-done. |
| **GR-SCOPED-VERIFY** | In lite mode, run **subset** of spec Verify matched to diff paths — not blind full monorepo if avoidable. See [reference.md](reference.md) § Scoped verify. |
| **GR-SECRETS** | No credentials in output. |

---

## Tiers

| Tier | When | Work done |
|------|------|-----------|
| **micro** (default) | Fine-grained spec; typically ≤5 AC, small PR | Scoped verify + AC + drift list + critical diff scan |
| **full** | User says `full` / `详细`, or >8 AC, or cross-cutting contract spec | Spec Verify block in full + contract pass + review Pass 1 |

Auto-pick **micro** unless user overrides.

---

## Lite workflow (4 steps)

```
1. Load spec + diff stat (<base>...HEAD)
2. Scoped verify (spec Verify ∩ diff-relevant commands)
3. AC + drift + contracts (if cited) + critical review — internal only
4. Emit OUTPUT-BRIEF to chat — stop
```

### Step 1 — Load

- Resolve spec path/id — [reference.md](reference.md)
- `<base>`: `origin/main` if spec says PR 独立性; else project default
- `git diff --stat <base>...HEAD` (+ unstaged if dirty)

### Step 2 — Scoped verify

1. Parse spec **Verify** block
2. Filter commands by changed paths (Go-only diff → skip `cd web && …`; web-only → skip `go test ./...` unless web imports broke)
3. If spec has no Verify: run **one** best-matching command from [reference.md](reference.md), not the whole fallback table
4. Any required command exit ≠ 0 → **不合格**

**Do not** invoke `/qa` or `/design-review` in lite mode. UI AC: one targeted MCP check or existing test only.

### Step 3 — Internal checks (do not dump to chat)

- **AC:** each id → pass/fail + one-line reason
- **Drift:** only out-of-scope paths (omit in-scope list)
- **Contract:** only if spec lists Depends/Provides or contract path — else skip
- **Review:** diff scan for **Critical/High** only (review skill Pass 1); ignore style/nits

### Step 4 — Output

Fill [_templates/OUTPUT-BRIEF.md](_templates/OUTPUT-BRIEF.md). **合格** only if: all AC pass, verify pass, zero drift, zero Critical/High.

**Optional full mode:** write [_templates/REPORT-FULL.md](_templates/REPORT-FULL.md) to disk — only when user explicitly requests.

---

## Verdict (internal → 合格/不合格/阻塞)

| Internal | 合格? |
|----------|-------|
| PASS | 合格 |
| PASS_WITH_DRIFT | 不合格（有漂移） |
| FAIL | 不合格 |
| BLOCKED | 阻塞 |

Chat uses **合格 / 不合格 / 阻塞** — not PASS/FAIL jargon unless user prefers English.

---

## Integration

| Result | Next |
|--------|------|
| 合格 | `pr-commit-with-review` or merge |
| 不合格 | Fix → re-run (max 3/session) |
| 阻塞 | Human provides env/spec |

---

## Config

Optional: [config.example.json](config.example.json) — `verifyMode`: `scoped` | `spec-full` | `full-fallback`

---

## More

- [SKILL_cn.md](SKILL_cn.md) — 中文主文档
- [reference.md](reference.md) — parsing, scoped verify
- [examples.md](examples.md) — sample brief output
