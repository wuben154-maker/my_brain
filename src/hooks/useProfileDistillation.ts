import { useCallback } from "react";
import {
  distillAndPersistUserProfile,
  formatConversationTranscript,
  hasUserSpeech,
  type TranscriptLineLike,
} from "@/lib/profileDistillation";
import { distilledMemoryItemsFromTranscript } from "@/lib/memoryGrounding";
import type { ConversationTurnLine } from "@/stores/conversationStore";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

export function conversationTurnsToLines(
  turns: ConversationTurnLine[],
): TranscriptLineLike[] {
  return turns.map((turn) => ({
    role: turn.role,
    text: turn.text,
    final: true,
  }));
}

export function mergeTranscriptLines(
  ...groups: TranscriptLineLike[][]
): TranscriptLineLike[] {
  return groups.flat();
}

/** Silent profile distillation — logs on failure, never blocks companion UI. */
export function useProfileDistillation() {
  const distillFromLines = useCallback(
    async (lines: TranscriptLineLike[]): Promise<boolean> => {
      if (!hasUserSpeech(lines)) {
        return true;
      }

      const storage = useAppStore.getState().storage;
      const llm = useAppStore.getState().providers?.llm;
      if (!storage || !llm) {
        console.warn(
          "[profile] distillation skipped: storage or language model unavailable",
        );
        return false;
      }

      try {
        const transcript = formatConversationTranscript(lines);
        const current = useProfileStore.getState().profile;
        const next = await distillAndPersistUserProfile(
          storage,
          llm,
          transcript,
          current,
        );
        useProfileStore.getState().setProfile(next);
        useProfileStore.getState().markDistilled(next.updatedAt);
        return true;
      } catch (error) {
        console.warn("[profile] distillation failed", error);
        return false;
      }
    },
    [],
  );

  const rememberFromLines = useCallback(async (lines: TranscriptLineLike[]) => {
    if (!hasUserSpeech(lines)) {
      return;
    }

    const memory = useAppStore.getState().providers?.memory;
    if (!memory) {
      return;
    }

    const transcript = formatConversationTranscript(lines);
    const items = distilledMemoryItemsFromTranscript(transcript);
    if (items.length === 0) {
      return;
    }

    try {
      await memory.remember(items);
    } catch {
      // Memory sidecar optional (M0/M1).
    }
  }, []);

  return { distillFromLines, rememberFromLines };
}
