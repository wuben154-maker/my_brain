/** Opt-in live HTTP fetch for public news sources (KP-01 smoke / productization). */
export function isNewsLiveFetchEnabled(): boolean {
  return import.meta.env.VITE_NEWS_LIVE_FETCH === "1";
}

/** Vitest / CI gate for network smoke tests. */
export function isLiveSourceSmokeEnabled(): boolean {
  return process.env.KP01_LIVE_SOURCE_SMOKE === "1";
}
