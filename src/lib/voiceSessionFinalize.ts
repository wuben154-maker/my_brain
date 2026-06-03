import type { TranscriptLineLike } from "@/lib/profileDistillation";

export interface FinalizeVoiceSessionParams {
  transcripts: TranscriptLineLike[];
  disconnectVoice: () => Promise<void>;
  /** true when profile was distilled and persisted (or nothing to distill); false keeps transcript. */
  distillProfile: (lines: TranscriptLineLike[]) => Promise<boolean>;
  rememberSession?: (lines: TranscriptLineLike[]) => Promise<void>;
  clearTranscripts: () => void;
}

/**
 * Invariant: distill user profile from transcript before clearing ephemeral voice UI state.
 * Order is fixed — disconnect → distill profile → optional memory remember → discard transcript display.
 */
export async function finalizeVoiceSession(
  params: FinalizeVoiceSessionParams,
): Promise<void> {
  const snapshot = [...params.transcripts];
  await params.disconnectVoice();
  const distillOk = await params.distillProfile(snapshot);
  if (params.rememberSession) {
    await params.rememberSession(snapshot);
  }
  if (distillOk) {
    params.clearTranscripts();
  }
}
