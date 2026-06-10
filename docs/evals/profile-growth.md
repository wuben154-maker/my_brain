# Eval — Profile growth

**Maturity:** **harness-backed** (learning trace, profile correction, feedback rerank). Silent distillation (V5) is **default** behavior but not fully “live profile OS” yet.

## What “pass” means

- Learning events (teach-more, skip, ingest, review) append to trace without writing graph/profile directly from radar.
- User profile corrections override conflicting distilled signals.
- Briefing feedback persists and affects subsequent ranking (replay harness).

## Three-path reminder

Profile growth consumes signals from **Radar 默认** sessions. Showcase uses fixed fixtures — profile loop tests use golden stores, not showcase script IDs alone.

## Verification commands

```bash
# Learning trace recording (no graph write)
pnpm test -- recordLearningTrace learningTrace

# Profile correction domain
pnpm test -- profileCorrection

# Feedback → next ranking replay
pnpm test -- feedbackReplay briefingFeedbackRepo

# Profile-influenced rerank integration
pnpm test -- profileRerank

# Teaching depth adaptation
pnpm test -- teachingDepth

# H3 memory eval harness (recall + profile growth mock curves)
pnpm test -- memoryEval
```

## Primary test files

| File | Focus |
|------|-------|
| `src/learning/recordLearningTrace.test.ts` | Trace append boundary |
| `src/domain/learning/learningTrace.test.ts` | Trace model |
| `src/domain/profile/profileCorrection.test.ts` | User corrections |
| `src/radar/feedbackReplay.test.ts` | Feedback → ranking |
| `src/storage/briefingFeedbackRepo.test.ts` | Persistent feedback |
| `src/radar/profileRerank.integration.test.ts` | Rerank with profile |
| `src/eval/memory/memoryEval.test.ts` | H3 harness |

## Spec cross-links

- [`specs/V5-profile-voice.md`](../../specs/V5-profile-voice.md)
- [`specs/KOS-C1-learning-trace.md`](../../specs/KOS-C1-learning-trace.md)
- [`specs/KOS-C2-profile-correction.md`](../../specs/KOS-C2-profile-correction.md)
- [`specs/kos-productization/KP-05-profile-teaching-loop.md`](../../specs/kos-productization/KP-05-profile-teaching-loop.md)
