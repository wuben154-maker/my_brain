import type {
  BriefingFeedback,
  BriefingFeedbackKind,
} from "@/domain/radar/briefingItem";
import type { RadarSignal } from "@/domain/radar/radarSignal";

const DEPTH_FEEDBACK_KINDS = new Set<BriefingFeedbackKind>([
  "too_shallow",
  "too_deep",
]);

/** Topic key for elaboration — shared primary graph links, not profile fields. */
export function getBriefingTopicKey(signals: RadarSignal[]): string {
  const primary = signals[0];
  if (!primary || primary.linkedNodeIds.length === 0) {
    return "";
  }
  return [...primary.linkedNodeIds].sort().join("|");
}

export function buildBriefingTopicKeyByItemId(
  signalsByItemId: Record<string, RadarSignal[]>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(signalsByItemId).map(([itemId, signals]) => [
      itemId,
      getBriefingTopicKey(signals),
    ]),
  );
}

/** Item/topic-level elaboration offset from briefing feedback only (not global profile). */
export function resolveBriefingElaborationOffset(input: {
  worldItemId: string;
  topicKey: string;
  feedbackByItemId: Record<string, BriefingFeedback[]>;
  topicKeyByItemId: Record<string, string>;
}): number {
  let offset = 0;
  for (const [itemId, feedbacks] of Object.entries(input.feedbackByItemId)) {
    const itemTopic = input.topicKeyByItemId[itemId] ?? "";
    const sameTopic =
      itemId === input.worldItemId ||
      (input.topicKey !== "" && itemTopic === input.topicKey);
    if (!sameTopic) {
      continue;
    }
    for (const feedback of feedbacks) {
      if (!DEPTH_FEEDBACK_KINDS.has(feedback.kind)) {
        continue;
      }
      if (feedback.kind === "too_shallow") {
        offset += 1;
      } else {
        offset -= 1;
      }
    }
  }
  return offset;
}

export function resolveBriefingElaborationDepth(input: {
  baseDepth: number;
  worldItemId: string;
  signals: RadarSignal[];
  feedbackByItemId: Record<string, BriefingFeedback[]>;
  topicKeyByItemId: Record<string, string>;
}): number {
  const topicKey = getBriefingTopicKey(input.signals);
  const offset = resolveBriefingElaborationOffset({
    worldItemId: input.worldItemId,
    topicKey,
    feedbackByItemId: input.feedbackByItemId,
    topicKeyByItemId: input.topicKeyByItemId,
  });
  return Math.max(0, input.baseDepth + offset);
}
