import type { TranscriptLineLike } from "@/lib/profileDistillation";

export interface FinalizeVoiceSessionParams {
  transcripts: TranscriptLineLike[];
  disconnectVoice: () => Promise<void>;
  distillProfile: (lines: TranscriptLineLike[]) => Promise<void>;
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
  await params.distillProfile(snapshot);
  if (params.rememberSession) {
    await params.rememberSession(snapshot);
  }
  params.clearTranscripts();
}
