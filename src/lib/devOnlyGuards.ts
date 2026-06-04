/**
 * Production builds must not seed or create graph concepts outside the voice「入」gate (invariant #2).
 * Demo URL modes and legacy UI create paths are dev-only.
 */
export function isDevBuild(): boolean {
  return import.meta.env.DEV;
}

/** `?visual=*` and `?graphDemo` snapshot bootstraps — visual-feedback tooling in dev only. */
export function shouldEnableDemoModes(): boolean {
  return isDevBuild();
}

/** Legacy non-voice create (manual panel, news ingest UI, proposal inbox approve). */
export function canUseLegacyNonVoiceGraphCreate(): boolean {
  return isDevBuild();
}
