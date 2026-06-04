import type { SelfCheckItem } from "@/stores/appStore";
import type { VoiceProvider } from "@/providers/voice/types";

export interface SpeakSelfCheckOptions {
  onItemStart?: (id: string) => void;
  signal?: AbortSignal;
}

export interface SpeakSelfCheckResult {
  spoken: string[];
  skipped: boolean;
}

/** Chinese utterance for one boot diagnostic row (V1 voice layer). */
export function formatSelfCheckSpeech(item: SelfCheckItem): string {
  if (item.status === "warn") {
    const detail = item.detail ? ` ${item.detail}` : "";
    return `${item.label}检查异常，将降级继续。${detail}`.trim();
  }
  if (item.status === "syncing") {
    return `正在检查${item.label}…`;
  }
  return `${item.label}，就绪。`;
}

/**
 * Speaks each self-check row in order via VoiceProvider.speak (interruptible).
 * Used during launch self_check; UI highlights via onItemStart.
 */
export async function speakSelfCheck(
  items: SelfCheckItem[],
  voice: VoiceProvider,
  opts?: SpeakSelfCheckOptions,
): Promise<SpeakSelfCheckResult> {
  const spoken: string[] = [];
  let skipped = false;

  for (const item of items) {
    if (opts?.signal?.aborted) {
      skipped = true;
      break;
    }

    opts?.onItemStart?.(item.id);
    const text = formatSelfCheckSpeech(item);

    try {
      await voice.speak(text, { interruptible: true });
      if (opts?.signal?.aborted) {
        skipped = true;
        break;
      }
      spoken.push(text);
    } catch {
      skipped = true;
      break;
    }
  }

  return { spoken, skipped };
}
