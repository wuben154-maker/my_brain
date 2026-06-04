import type { TranscriptLineLike } from "@/lib/profileDistillation";

export interface FinalizeCompanionDisconnectParams {
  transcripts: TranscriptLineLike[];
  disconnectVoice: () => Promise<void>;
  clearTranscripts: () => void;
}
