import type { UserModeProfile } from "../domain/userMode.js";
import type { M5FeatureFlags } from "./featureFlags.js";
import { isM5ExperienceEnabled, resolveM5FeatureFlags } from "./featureFlags.js";
import { buildEvidenceBundle } from "./evidence.js";
import { buildMemoryWeather } from "./memoryWeather.js";
import { buildMemoryReplay } from "./memoryReplay.js";
import { buildReverseQuestion } from "./reverseQuestion.js";
import type { M5EvidenceBundle, M5SignatureExperiences } from "./types.js";

export interface BuildM5ExperiencesInput {
  profile: UserModeProfile;
  evidence: M5EvidenceBundle;
  replayCursor?: string | null;
  reverseQuestionSeed?: string;
  featureFlags?: Partial<M5FeatureFlags>;
  learningTraceWarning?: boolean;
}

export function buildM5SignatureExperiences(
  input: BuildM5ExperiencesInput,
): M5SignatureExperiences {
  const flags = resolveM5FeatureFlags(input.featureFlags);
  const bundle = input.evidence;

  const weatherRaw = buildMemoryWeather(input.profile, bundle, {
    learningTraceWarning: input.learningTraceWarning,
  });
  const replayRaw = buildMemoryReplay(
    input.profile,
    bundle,
    input.replayCursor ?? null,
  );
  const questionRaw = buildReverseQuestion(
    input.profile,
    bundle,
    input.reverseQuestionSeed,
  );

  return {
    weather: isM5ExperienceEnabled(flags, "weather")
      ? weatherRaw
      : { visible: false, cards: [] },
    replay: isM5ExperienceEnabled(flags, "replay")
      ? replayRaw
      : {
          visible: false,
          outputKind: replayRaw.outputKind,
          frames: [],
          cursor: replayRaw.cursor,
          durationMs: replayRaw.durationMs,
        },
    reverseQuestion: isM5ExperienceEnabled(flags, "reverse_question")
      ? questionRaw
      : {
          visible: false,
          outputKind: questionRaw.outputKind,
          prompt: "",
          evidenceRefs: [],
          nodeIds: [],
        },
  };
}

export { buildEvidenceBundle };
