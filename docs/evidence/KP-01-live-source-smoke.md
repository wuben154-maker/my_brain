# KP-01 Live Source Smoke Evidence

> Env-gated manual smoke for Radar live ingest. Default CI / `pnpm test` **does not** hit the network.

## Command

```bash
# PowerShell
$env:KP01_LIVE_SOURCE_SMOKE="1"; pnpm test -- liveSourceSmoke

# bash
KP01_LIVE_SOURCE_SMOKE=1 pnpm test -- liveSourceSmoke
```

## Source under test

- **Path:** `fetchGitHubTrendingLiveSmoke()` in `src/providers/news/githubTrendingSource.ts`
- **Endpoint:** GitHub public Search API (no API key)
- **Ranking:** `mapNewsFetchResultToWorldItems` → `rankWorldItems`

## Result log

| Field | Value |
|-------|-------|
| Date (UTC) | 2026-06-10 |
| Runner | Cursor main agent |
| `KP01_LIVE_SOURCE_SMOKE` | `1` |
| Repos fetched | 5 |
| Ranked count | 5 |
| Vitest exit | 0 |
| Notes | `pnpm test -- liveSourceSmoke` fetched GitHub public Search API results and ranked top3 with signal counts `1, 2, 1`. Default automated runs still skip the live fetch unless the env var is set. |

## Default CI behavior

Without `KP01_LIVE_SOURCE_SMOKE=1`, Vitest reports the live fetch case as **skipped** — not a failure.
