import type { IngestCommand } from "@/conversation/types";

export type IngestParseResult =
  | { kind: "command"; command: IngestCommand }
  | { kind: "reprompt" };

function matchesSkip(transcript: string): boolean {
  return /不要|跳过|算了|不收|不入|别要|不需要/i.test(transcript);
}

function matchesElaborate(transcript: string): boolean {
  return /讲细|细点|展开|多说|详细|再讲|深入/i.test(transcript);
}

function matchesIngest(transcript: string): boolean {
  if (/(不要|别|不).{0,3}(入|收|记)/i.test(transcript)) {
    return false;
  }
  return /入|收录|记下来|要记|记进|收进/i.test(transcript);
}

/**
 * Classify voice ingest answers. Ambiguous first attempt → reprompt; second → skip.
 */
export function parseIngestCommand(
  transcript: string,
  attempt: 1 | 2,
): IngestParseResult {
  const text = transcript.trim();
  if (!text) {
    return attempt === 1 ? { kind: "reprompt" } : { kind: "command", command: "skip" };
  }

  // Tentative phrasing ("…吧") on first attempt → clarify before ingest.
  if (attempt === 1 && /吧[。.!?]?$/u.test(text) && matchesIngest(text)) {
    return { kind: "reprompt" };
  }

  const hits: IngestCommand[] = [];
  if (matchesSkip(text)) {
    hits.push("skip");
  }
  if (matchesElaborate(text)) {
    hits.push("elaborate");
  }
  if (matchesIngest(text)) {
    hits.push("ingest");
  }

  if (hits.length === 1) {
    return { kind: "command", command: hits[0]! };
  }

  return attempt === 1
    ? { kind: "reprompt" }
    : { kind: "command", command: "skip" };
}
