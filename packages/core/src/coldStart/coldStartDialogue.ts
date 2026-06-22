import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import { inferUserModeProfileFromDialogue } from "../radar/adaptiveRadar.js";
import { userModeLabel } from "../profile/correctionHistory.js";

/** Minimum user turns before profile summary is shown (module B). */
export const COLD_START_MIN_USER_TURNS = 3;

const PRIMARY_MODE_CYCLE: UserMode[] = [
  "learner",
  "tech_tracker",
  "personal_memory",
  "founder_project",
  "creator_researcher",
];

export function coldStartAssistantReply(userTurnIndex: number): string {
  if (userTurnIndex === 1) {
    return "我听到了。不用选类别，随便说 — 你更希望我帮你做什么？";
  }
  if (userTurnIndex === 2) {
    return "有意思。还有什么是你最近特别在意的项目或话题？";
  }
  if (userTurnIndex === 3) {
    return "差不多了解了。我先整理一版画像摘要，你看对不对。";
  }
  return "我们可以继续聊，或者你先确认下面的画像摘要。";
}

export function formatProfileModeLine(profile: UserModeProfile): string {
  const labels = [
    userModeLabel(profile.primaryMode),
    ...profile.secondaryModes.map((mode) => userModeLabel(mode)),
  ];
  return [...new Set(labels)].join(" + ");
}

export function inferColdStartProfile(utterances: string[]): UserModeProfile {
  return inferUserModeProfileFromDialogue(utterances);
}

export function cyclePrimaryMode(current: UserMode): UserMode {
  const index = PRIMARY_MODE_CYCLE.indexOf(current);
  const next = index < 0 ? 0 : (index + 1) % PRIMARY_MODE_CYCLE.length;
  return PRIMARY_MODE_CYCLE[next] ?? "personal_memory";
}

export function isColdStartDialogueComplete(userTurnCount: number): boolean {
  return userTurnCount >= COLD_START_MIN_USER_TURNS;
}
