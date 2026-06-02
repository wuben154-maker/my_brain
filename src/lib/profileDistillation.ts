import type { UserProfile } from "@/domain/profile";
import type { LlmProvider } from "@/providers/llm/types";
import type { StorageProvider } from "@/storage/types";

export interface TranscriptLineLike {
  role: "user" | "assistant";
  text: string;
  final?: boolean;
}

/** Plain-text transcript for LLM distillation — user + assistant turns only. */
export function formatConversationTranscript(
  lines: TranscriptLineLike[],
): string {
  return lines
    .filter((line) => line.text.trim() && line.final !== false)
    .map((line) => `${line.role === "user" ? "用户" : "助手"}: ${line.text.trim()}`)
    .join("\n");
}

export function hasUserSpeech(lines: TranscriptLineLike[]): boolean {
  return lines.some(
    (line) => line.role === "user" && line.text.trim() && line.final !== false,
  );
}

/**
 * Layer-③ distillation: persist profile signals before raw transcript/audio is discarded.
 */
export async function distillAndPersistUserProfile(
  storage: StorageProvider,
  llm: LlmProvider,
  transcript: string,
  current?: UserProfile,
): Promise<UserProfile> {
  const base = current ?? (await storage.loadUserProfile());
  const next = await llm.distillUserProfile(transcript, base);
  await storage.saveUserProfile(next);
  return next;
}
