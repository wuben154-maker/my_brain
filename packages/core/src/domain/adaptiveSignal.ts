import type { UserMode } from "./userMode.js";

export type AdaptiveSourceType =
  | "radar"
  | "capture"
  | "learning"
  | "project"
  | "memory";

export type AdaptivePrivacyLevel = "local_only" | "exportable" | "no_export";

export type AdaptiveSuggestedIntent =
  | "explain_more"
  | "capture"
  | "ingest_candidate";

/** Unified AdaptiveRadar candidate contract — M0 types; M1 implementation. */
export interface AdaptiveSignal {
  sourceType: AdaptiveSourceType;
  userModeFit: UserMode;
  freshness: number;
  evidenceRefs: string[];
  confidence: number;
  privacyLevel: AdaptivePrivacyLevel;
  suggestedIntent: AdaptiveSuggestedIntent;
}
