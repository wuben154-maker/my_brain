# UI Contract — KOS Productization Main Path

> KP-00 contract for the KOS productization path. This file defines how the v2
> immersive scene carries Radar, Weekly Review, and Action drafts without turning
> the product back into a dashboard.

## Primary Shape

The default product surface remains a single immersive companion scene:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Settings corner                                                   │
│                                                                  │
│  Knowledge graph stage                                            │
│  data-testid="graph-pane"                                        │
│                                                                  │
│                              ┌──────────────────────────────┐     │
│                              │ CompanionShell carrier        │     │
│                              │ radar / curation / review / action │ │
│                              └──────────────────────────────┘     │
│                                   Voice orb region                │
│                                   data-testid="voice-orb-region" │
└──────────────────────────────────────────────────────────────────┘
```

The first visual anchor is the graph stage. The second is the voice orb. The
third is the companion shell, which appears only when Radar, Review, or Action
content needs focus. Settings stays a corner configuration surface, not a main
workflow container.

## Regions

| Region | Test ID | Responsibility | Boundary |
|--------|---------|----------------|----------|
| Immersive scene | `immersive-scene` | Full-screen KOS companion surface | No NavRail, dashboard tabs, or multi-page primary workflow |
| Graph stage | `graph-pane` | Force-directed graph, zoom/pan, node light-up after confirmed ingest | Must remain the primary visual stage |
| Voice orb | `voice-orb-region`, `voice-orb` | Voice-first companion, barge-in, ingest confirmation | No visible push-to-talk/control panel on the companion main path |
| Companion shell | `companion-shell` | Shared carrier for Radar, curation report, Weekly Review, and Action drafts | One shell, not four unrelated overlays |
| Settings | `settings-corner`, `settings-overlay` | Persona, voice, provider diagnostics, experimental controls | Must not be the only entry for Radar, Review, or Action |

## Companion Shell Slots

`CompanionShell` owns four stable slots:

| Slot | Test ID | Content Contract | Entry Semantics |
|------|---------|------------------|-----------------|
| Radar | `companion-shell-radar-slot` | Daily top 3, RadarSignal explanation, source/fallback status | **KP-01:** auto-open after normal launch completes (not via Settings) |
| Curation | `companion-shell-curation-slot` | Post-ingest/auto-curate report, reason codes, affected nodes, undo affordance | **KP-03:** opens after confirmed ingest or auto-curate completes (not via Settings) |
| Review | `companion-shell-review-slot` | Weekly Brain Review tied to graph history citations | **KP-03:** natural follow-up after curation report or auto-curate batch (not via Settings) |
| Action | `companion-shell-action-slot` | Draft previews, risk labels, permission state | Draft-only until KP-15 controlled execution |

Mainflow entry carrier (inert in KP-00, testable now):

| Carrier | Test ID | Semantics |
|---------|---------|-----------|
| Review entry | `companion-shell-review-entry-carrier` | Documents the KP-03 primary Review open path (`post-ingest` or `auto-curate`). Must not be wired only through Settings. |

Open, close, and back behavior must stay consistent across all four slots:

- `activeSlot="radar" | "curation" | "review" | "action"` selects the visible slot.
- `companion-shell-close` closes the active shell content without changing graph data.
- `companion-shell-back` returns to the previous companion surface when a flow has depth.
- Idle mode keeps the slot test IDs mounted but visually hidden; it must not add visible
  buttons to the current companion main screen.

## Mainflow Entry Semantics (KP-00 contract, implementation in later specs)

| Phase | Trigger | Opens | Settings role |
|-------|---------|-------|---------------|
| KP-01 | Normal launch completes | `CompanionShell` **Radar** slot auto-open | Secondary/diagnostic only |
| KP-03 | User confirms ingest | **Curation** slot (report) then optional **Review** slot | Secondary/diagnostic only |
| KP-03 | Auto-curate batch completes | **Curation** slot, then **Review** slot when history exists | Secondary/diagnostic only |
| KP-00 legacy | Settings panel actions | Existing standalone overlays (`weekly-review-overlay`, etc.) | Temporary bridge only — **not** the long-term mainflow |

Contract rule: Settings must not remain the **only** runtime entry for Radar, curation report, Weekly Review, or Action drafts once KP-01/KP-03 land.

## Legacy Overlay Migration Matrix (KP-00)

Standalone overlays in `ImmersiveScene` are **auxiliary legacy surfaces** pending KP-02/KP-03 migration. New KOS productization UI must use `CompanionShell` slots instead of adding parallel overlays.

| Legacy surface | Test ID | z-index | Status | Migration target | New KP UI rule |
|----------------|---------|---------|--------|------------------|----------------|
| Curation report | `curation-report-overlay` | 30 | Auxiliary legacy | `companion-shell-curation-slot` (KP-03) | Do not add new curation UI here |
| Weekly review | `weekly-review-overlay` | 30 | Auxiliary legacy | `companion-shell-review-slot` (KP-03) | Do not add new review UI here |
| Interview | `interview-overlay` | 30 | Auxiliary legacy | Voice/onboarding flow (KP-02+) | Do not add new interview UI here |
| Companion shell | `companion-shell` | 20 | **Canonical carrier** | — | All new Radar/curation/review/action UI |
| Settings | `settings-corner`, `settings-overlay` | 20 | Config only | — | No sole mainflow entry |

Stacking rule during migration: legacy overlays may appear above the graph (z-30) but must not outrank the contract goal of consolidating into `companion-shell` (z-20). KP-03 removes duplicate legacy open paths once shell slots are wired.

## Main Paths

| Path | Trigger | Contract |
|------|---------|----------|
| Radar default | No query flag / normal launch | Mock-first Radar briefing is the main product entry. Real sources may enhance it; failures fall back safely. |
| Showcase demo | `?showcase=1` | Fixed curated demo for screenshots and interviews. It is not the default product path. |
| RSS flatten legacy | Internal fallback only | May preserve degraded briefing behavior when Radar/source work fails. It must never be documented or rendered as the main path. |

## States

| Surface | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Companion shell | Shell may show a concise status line inside the active slot | Warm explanation plus next action; no generic "No items" copy | Explain failure and safe retry; keep graph and voice usable | Active slot shows focused content and close/back semantics | Show available content plus degraded source/status note |
| Radar slot | "正在筛选今日 3 条变化" | "今天没有足够相关的新变化" plus feedback/profile hint | Source failure plus fallback label | Top 3 with at least one RadarSignal each | Real source failed, mock/fallback top 3 still available |
| Curation slot | "正在整理入库结果" | "暂无整理报告" | History unavailable; keep graph usable | Report with reason codes and affected nodes | Partial history; cite only known rows |
| Review slot | "正在读取本周图谱变化" | "本周还没有可回顾的图谱变化" | History unavailable; do not invent review | Review cites real graph changes | Some history rows unavailable; cite only known rows |
| Action slot | "正在生成草稿" | "暂无可行动建议" | Draft generation failed; no external write happened | Draft preview with risk and permission state | Draft exists but external execution disabled or pending confirmation |

## Responsive Rules

- Desktop first: graph stays full-screen, voice orb floats on the right, shell appears
  above/near the orb.
- Width below 1024px: shell may move toward the bottom center, but must not become a
  multi-tab dashboard.
- Width below 720px: show one active slot at a time and keep touch targets at least 44px.
- Respect `prefers-reduced-motion`; looping shell transitions must collapse to opacity or
  static state changes.

## Accessibility

- `CompanionShell` is a labelled region: `aria-label="伴侣浮层承载区"`.
- Active shell controls use real buttons with visible Chinese labels.
- Idle shell content is hidden from assistive tech via `aria-hidden`.
- Slot content must not rely on color alone; source/fallback/draft-only state needs text.

## Forbidden UI Behaviors

- Do not design a silent permanent graph create path.
- Do not make Settings the only way to open Radar, curation reports, Weekly Review, or Action drafts.
- Do not restore NavRail/dashboard tabs as the main product workflow.
- Do not present `WorldItem`, provisional candidates, or action drafts as confirmed
  permanent graph knowledge.
- Do not label showcase or legacy RSS fallback as the default experience.

## Contract Tests

The KP-00 test contract requires these IDs to exist in rendered output:

```text
immersive-scene
graph-pane
voice-orb-region
voice-orb
settings-corner
companion-shell
companion-shell-surface
companion-shell-radar-slot
companion-shell-curation-slot
companion-shell-review-slot
companion-shell-review-entry-carrier
companion-shell-action-slot
```

Verification command:

```bash
pnpm test -- ImmersiveScene CompanionShell uiContract
```
