import type { ProvisionalCandidate } from "@my-brain/core";

import { useProvisionalStore } from "../stores/provisionalStore";

const captureBridge = {
  provider: (): ProvisionalCandidate[] => [],
};

export function registerM5CaptureProvider(provider: () => ProvisionalCandidate[]): void {
  captureBridge.provider = provider;
}

export function getM5CaptureCandidates(): ProvisionalCandidate[] {
  return captureBridge.provider();
}

/** Register M5 read-side bridge after store hydration (decoupled from provisionalStore init). */
export function wireM5CaptureBridge(): void {
  registerM5CaptureProvider(() => useProvisionalStore.getState().candidates);
}
