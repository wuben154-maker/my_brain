import type { ConversationConductor } from "@/conversation/ConversationConductor";
import {
  applyIngestDecision,
  type IngestDecisionDeps,
} from "@/conversation/ingestActions";
import type { ConversationContext, IngestCommand } from "@/conversation/types";
import { parseIngestCommand } from "@/lib/parseIngestCommand";
import {
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
  SHOWCASE_INGEST_NODE_ID,
  SHOWCASE_VOICE_SCRIPT,
} from "@/showcase/showcaseFixtures";
import { useIngestStore } from "@/stores/ingestStore";

export type ShowcaseBriefingStep = 0 | 1 | 2 | "done";

export type ShowcaseCompanionScriptAction =
  | "enter_briefing"
  | "ingest_command";

export interface ShowcaseCompanionScriptStep {
  action: ShowcaseCompanionScriptAction;
  /** For ingest_command — transcript injected per SHOWCASE_VOICE_SCRIPT. */
  transcript?: string;
  /** Expected brief index after the step completes (when applicable). */
  briefIndex?: ShowcaseBriefingStep;
  expectedCommand?: IngestCommand;
}

/** Deterministic briefing loop aligned with KOS-A1 SHOWCASE_VOICE_SCRIPT ingest steps. */
export const SHOWCASE_COMPANION_SCRIPT: ShowcaseCompanionScriptStep[] = [
  { action: "enter_briefing", briefIndex: 0 },
  {
    action: "ingest_command",
    transcript: "不要",
    briefIndex: 0,
    expectedCommand: "skip",
  },
  {
    action: "ingest_command",
    transcript: "讲细点",
    briefIndex: 1,
    expectedCommand: "elaborate",
  },
  {
    action: "ingest_command",
    transcript: "不要",
    briefIndex: 1,
    expectedCommand: "skip",
  },
  {
    action: "ingest_command",
    transcript: "入",
    briefIndex: 2,
    expectedCommand: "ingest",
  },
];

export interface ShowcaseCompanionScriptDeps {
  conductor: ConversationConductor;
  getContext: () => ConversationContext;
  ingestDeps: IngestDecisionDeps;
  speak?: boolean;
}

export interface ShowcaseCompanionScriptResult {
  finalBriefingStep: ShowcaseBriefingStep;
  newsCursor: number;
  ingestedIds: string[];
  skippedIds: string[];
  elaborationDepth: number;
  /** Max depth observed during the script (skip resets depth at end). */
  peakElaborationDepth: number;
}

function ingestStepsFromVoiceScript(): ShowcaseCompanionScriptStep[] {
  const ingestTranscripts = SHOWCASE_VOICE_SCRIPT.filter(
    (step) => step.kind === "ingest_parse",
  );
  const steps: ShowcaseCompanionScriptStep[] = [
    { action: "enter_briefing", briefIndex: 0 },
  ];
  let briefIndex: ShowcaseBriefingStep = 0;
  for (const voiceStep of ingestTranscripts) {
    if (voiceStep.step === "2b") {
      briefIndex = 1;
    } else if (voiceStep.step === 3) {
      briefIndex = 2;
    }
    steps.push({
      action: "ingest_command",
      transcript: voiceStep.transcript,
      briefIndex,
      expectedCommand: voiceStep.expectedCommand,
    });
  }
  return steps;
}

export const SHOWCASE_COMPANION_SCRIPT_FROM_VOICE =
  ingestStepsFromVoiceScript();

export function expectedShowcaseBriefId(
  step: ShowcaseBriefingStep,
): string | undefined {
  if (step === "done") {
    return undefined;
  }
  return SHOWCASE_BRIEFING_ITEMS[step]?.id;
}

export function briefingStepFromCursor(cursor: number): ShowcaseBriefingStep {
  if (cursor >= SHOWCASE_BRIEFING_ITEMS.length) {
    return "done";
  }
  return cursor as ShowcaseBriefingStep;
}

async function applyShowcaseIngestCommand(
  transcript: string,
  deps: ShowcaseCompanionScriptDeps,
): Promise<void> {
  const ctx = deps.getContext();
  const item = ctx.newsQueue[ctx.newsCursor] ?? null;
  if (!item || !deps.conductor) {
    throw new Error("showcaseCompanionScript: no active briefing item");
  }

  const ingest = useIngestStore.getState();
  const parsed = parseIngestCommand(transcript, ingest.ingestParseAttempt);

  if (parsed.kind === "reprompt") {
    ingest.setIngestParseAttempt(2);
    await deps.conductor.dispatch(
      { type: "ingestReprompt" },
      { speak: deps.speak !== false },
    );
    return;
  }

  ingest.resetIngestParseAttempt();
  const { event } = await applyIngestDecision(parsed.command, item, deps.ingestDeps);
  if (event) {
    await deps.conductor.dispatch(event, { speak: deps.speak !== false });
  }
}

/**
 * Runs the full showcase briefing script: skip / elaborate / ingest on three fixed briefs.
 */
export async function runShowcaseCompanionScript(
  deps: ShowcaseCompanionScriptDeps,
  steps: ShowcaseCompanionScriptStep[] = SHOWCASE_COMPANION_SCRIPT,
): Promise<ShowcaseCompanionScriptResult> {
  let peakElaborationDepth = 0;

  for (const step of steps) {
    if (step.action === "enter_briefing") {
      await deps.conductor.enterShowcaseBriefing({ speak: deps.speak !== false });
      continue;
    }

    if (step.action === "ingest_command" && step.transcript) {
      if (step.expectedCommand) {
        const attempt = useIngestStore.getState().ingestParseAttempt;
        const parsed = parseIngestCommand(step.transcript, attempt);
        expectCommand(parsed, step.expectedCommand);
      }
      await applyShowcaseIngestCommand(step.transcript, deps);
      peakElaborationDepth = Math.max(
        peakElaborationDepth,
        useIngestStore.getState().elaborationDepth,
      );
    }
  }

  const ctx = deps.getContext();
  const ingest = useIngestStore.getState();
  return {
    finalBriefingStep: deps.conductor.getShowcaseBriefingStep(),
    newsCursor: ctx.newsCursor,
    ingestedIds: [...ingest.ingestedIds],
    skippedIds: [...ingest.skippedIds],
    elaborationDepth: ingest.elaborationDepth,
    peakElaborationDepth,
  };
}

function expectCommand(
  parsed: ReturnType<typeof parseIngestCommand>,
  expected: IngestCommand,
): void {
  if (parsed.kind !== "command" || parsed.command !== expected) {
    throw new Error(
      `showcaseCompanionScript: expected ${expected}, got ${JSON.stringify(parsed)}`,
    );
  }
}

export function assertShowcaseIngestOutcome(): void {
  const ingest = useIngestStore.getState();
  if (!ingest.ingestedIds.includes(SHOWCASE_DESIGNATED_INGEST_BRIEF_ID)) {
    throw new Error(
      `showcaseCompanionScript: expected ingest of ${SHOWCASE_DESIGNATED_INGEST_BRIEF_ID}`,
    );
  }
  if (!ingest.skippedIds.includes("showcase-brief-1")) {
    throw new Error("showcaseCompanionScript: expected skip of showcase-brief-1");
  }
  if (!ingest.skippedIds.includes("showcase-brief-2")) {
    throw new Error("showcaseCompanionScript: expected skip of showcase-brief-2");
  }
}

export { SHOWCASE_INGEST_NODE_ID };
