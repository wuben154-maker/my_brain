import { M5_FEATURE_FLAG_DEFAULTS, resolveM5FeatureFlags } from "@my-brain/core";
import type { M5FeatureFlags } from "@my-brain/core";

export { M5_FEATURE_FLAG_DEFAULTS, resolveM5FeatureFlags };
export type { M5FeatureFlags };

/** Production default: all M5 experiences enabled; no master kill-switch. */
export const M5_MOBILE_FEATURE_FLAGS = resolveM5FeatureFlags();
