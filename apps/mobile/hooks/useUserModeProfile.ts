import { useCallback } from "react";

import type { UserModeProfile } from "@my-brain/core";
import { inferUserModeProfileFromDialogue } from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";

export function useUserModeProfile() {
  const profile = useMobileAppStore((s) => s.userProfile);
  const completeColdStart = useMobileAppStore((s) => s.completeColdStart);

  const seedFromUtterances = useCallback(
    (utterances: string[], fixtureId?: string): UserModeProfile => {
      const next = inferUserModeProfileFromDialogue(utterances, fixtureId);
      completeColdStart(next);
      return next;
    },
    [completeColdStart],
  );

  return { profile, seedFromUtterances };
}
