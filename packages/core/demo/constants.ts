/** App meta key — true when demo seed is active (labeled, resettable). */
export const DEMO_MODE_META_KEY = "demo_mode";

/** User-scoped cognitive-action audit ring buffer — cleared on demo reset. */
export const ACTION_AUDIT_META_KEY = "action.audit.v1";

/** Seed bundle identifier written on reset. */
export const DEMO_SEED_VERSION = "demo_graph_v1";

/** Graph node ingestSource label for deterministic demo fixtures — not live user data. */
export const DEMO_FIXTURE_SOURCE = "demo_fixture";
