/** Primary user evolution modes — M0 contract; routing implementation in M1. */
export type UserMode =
  | "tech_tracker"
  | "learner"
  | "creator_researcher"
  | "founder_project"
  | "personal_memory";

export interface UserModeProfile {
  primaryMode: UserMode;
  secondaryModes: UserMode[];
  /** 0–1 cold-start / inference confidence */
  confidence: number;
  /** Recent session intent summary — non-sensitive */
  recentIntent?: string;
  /** ISO8601 — last manual correction */
  lastCorrectionAt?: string;
}

export const USER_MODES: readonly UserMode[] = [
  "tech_tracker",
  "learner",
  "creator_researcher",
  "founder_project",
  "personal_memory",
] as const;

export function isUserMode(value: string): value is UserMode {
  return (USER_MODES as readonly string[]).includes(value);
}
