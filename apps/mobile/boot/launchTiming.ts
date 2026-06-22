/** Logo fade-in duration — matches splash contract hero reveal. */
export const LAUNCH_LOGO_FADE_MS = 400;
/** Delay before tagline fade begins. */
export const LAUNCH_TAGLINE_DELAY_MS = 400;
/** Tagline fade-in duration. */
export const LAUNCH_TAGLINE_FADE_MS = 800;
/** Earliest handoff — tagline fully visible (delay + fade). Splash must not blink. */
export const LAUNCH_MIN_MS = LAUNCH_TAGLINE_DELAY_MS + LAUNCH_TAGLINE_FADE_MS;
/** Max in-app launch hold before handoff (migration path uses MigrationGate instead). */
export const LAUNCH_MAX_MS = 1800;
