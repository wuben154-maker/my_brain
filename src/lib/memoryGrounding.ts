import type {
  MemoryItem,
  MemoryProvider,
  RecalledMemory,
} from "@/providers/memory/types";

export const DEFAULT_RECALL_TOP_K = 5;
export const DEFAULT_GROUNDING_MAX_CHARS = 1200;

export interface RecallMixOptions {
  relevantRatio?: number;
}

export function selectRecallMix(
  recalled: RecalledMemory[],
  opts: RecallMixOptions = {},
): RecalledMemory[] {
  if (recalled.length === 0) {
    return [];
  }

  const relevantRatio = opts.relevantRatio ?? 0.8;
  const relevantSlots = Math.max(1, Math.round(recalled.length * relevantRatio));
  const stableSlots = Math.max(0, recalled.length - relevantSlots);

  const byScore = [...recalled].sort((a, b) => b.score - a.score);
  const relevant = byScore.slice(0, relevantSlots);

  const relevantKeys = new Set(
    relevant.map((entry) => entry.item.id ?? entry.item.text),
  );
  const stable = [...recalled]
    .filter((entry) => !relevantKeys.has(entry.item.id ?? entry.item.text))
    .sort((a, b) => a.item.timestamp - b.item.timestamp)
    .slice(0, stableSlots);

  return [...relevant, ...stable];
}

export function buildGroundingContext(
  recalled: RecalledMemory[],
  opts?: { maxChars?: number },
): string {
  if (recalled.length === 0) {
    return "";
  }

  const maxChars = opts?.maxChars ?? DEFAULT_GROUNDING_MAX_CHARS;
  const lines = recalled.map((entry) => `- ${entry.item.text.trim()}`);
  let body = lines.join("\n");
  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars - 1)}…`;
  }
  return `<memory>\n${body}\n</memory>`;
}

/** Strip leading memory block before JSON parsing (propose context). */
export function stripMemoryPrefixFromContext(context: string): string {
  return context.replace(/^<memory>[\s\S]*?<\/memory>\s*/, "");
}

export async function recallGroundingContext(
  memory: MemoryProvider | undefined,
  query: string,
): Promise<string> {
  if (!memory || !query.trim()) {
    return "";
  }

  try {
    const recalled = await memory.recall({
      query: query.trim(),
      topK: DEFAULT_RECALL_TOP_K,
    });
    const mixed = selectRecallMix(recalled);
    return buildGroundingContext(mixed);
  } catch {
    return "";
  }
}

/** Distilled episode text for remember — user turns only, no full assistant transcript. */
export function distilledMemoryItemsFromTranscript(
  transcript: string,
): MemoryItem[] {
  const userLines = transcript
    .split("\n")
    .filter((line) => line.startsWith("用户:"))
    .map((line) => line.replace(/^用户:\s*/, "").trim())
    .filter(Boolean);

  if (userLines.length === 0) {
    return [];
  }

  const episodeText = userLines.join("；").slice(0, 320);
  const factText = userLines[userLines.length - 1]!.slice(0, 200);
  const timestamp = Date.now();
  return [
    {
      kind: "episode",
      text: `对话摘要：${episodeText}`,
      timestamp,
    },
    {
      kind: "fact",
      text: factText,
      timestamp,
    },
  ];
}

export function prependGrounding(base: string, grounding: string): string {
  if (!grounding.trim()) {
    return base;
  }
  return `${grounding}\n\n${base}`;
}
