# Eval — Action usefulness

**Maturity:** **harness-backed** draft-only (KOS-E). **Experimental:** any external execution (KP-15 controlled action) — not default.

## What “pass” means

- `CognitiveAction` artifacts stay at **suggest / draft** permission — no automatic issue/blog publish.
- Weekly Review mainflow produces citable drafts tied to real graph history.
- Brain MCP remains read-only (no write tools in default catalog).

## Three-path reminder

Action drafts may surface in companion shell on **Radar 默认** path after review/curation. Showcase does not promise autonomous external writes.

## Verification commands

```bash
# Draft-only boundary (Weekly Review → action wrapper)
pnpm test -- draftOnlyBoundary actionDraftGuard

# CognitiveAction schema + store
pnpm test -- cognitiveAction

# Weekly Review mainflow + citations
pnpm test -- weeklyReviewMainflow weeklyReviewCitations buildWeeklyBrainReview

# Project/blog/research generators stay draft-only
pnpm test -- projectSuggestionsBoundary generateBlogDraft generateResearchFollowups

# Brain MCP forbidden write tools
pnpm test -- brainMcpForbidden brainMcpRead
```

## Primary test files

| File | Focus |
|------|-------|
| `src/cognitive/draftOnlyBoundary.test.ts` | Draft-only UI + action wrapper |
| `src/actions/actionDraftGuard.test.ts` | Permission guard |
| `src/domain/actions/cognitiveAction.test.ts` | Action model |
| `src/cognitive/weeklyReviewMainflow.test.ts` | Review → companion flow |
| `src/cognitive/buildWeeklyBrainReview.test.ts` | History-backed review |
| `src/mcp/brainMcpForbidden.test.ts` | No MCP graph writes |

## Spec cross-links

- [`specs/KOS-E1-action-schema.md`](../../specs/KOS-E1-action-schema.md)
- [`specs/KOS-D3-weekly-brain-review.md`](../../specs/KOS-D3-weekly-brain-review.md)
- [`specs/kos-productization/KP-03-weekly-review-mainflow.md`](../../specs/kos-productization/KP-03-weekly-review-mainflow.md)
- [`specs/kos-productization/KP-15-controlled-action-agent.md`](../../specs/kos-productization/KP-15-controlled-action-agent.md) (**experimental**)
