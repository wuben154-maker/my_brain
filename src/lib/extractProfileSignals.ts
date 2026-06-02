/** Heuristic signals extracted from conversation text (Mock LLM distillation). */
export interface ProfileSignals {
  displayName: string | null;
  interests: string[];
  knownTopics: string[];
  unknownTopics: string[];
  explanationStyle: string | null;
  habits: string[];
}

function collectMatches(text: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  for (const match of text.matchAll(global)) {
    const captured = match[1]?.trim();
    if (captured && captured.length >= 2) {
      results.push(normalizeTopic(captured));
    }
  }
  return results;
}

function normalizeTopic(raw: string): string {
  return raw
    .replace(/^(一下|一些|一点|关于|有关)/, "")
    .replace(/[吗呢吧啊呀]$/, "")
    .trim();
}

function mergeUnique(existing: string[], additions: string[]): string[] {
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  const next = [...existing];
  for (const item of additions) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(trimmed);
  }
  return next;
}

function extractFromUserLines(transcript: string): string {
  return transcript
    .split("\n")
    .filter((line) => line.startsWith("用户:"))
    .map((line) => line.slice(3).trim())
    .join("\n");
}

function inferKeywordSignals(userText: string): ProfileSignals {
  const interests: string[] = [];
  const knownTopics: string[] = [];
  const unknownTopics: string[] = [];

  if (/资讯|新闻|github|趋势/i.test(userText)) {
    interests.push("AI 资讯与 GitHub 趋势");
  }
  if (/agent|智能体/i.test(userText)) {
    interests.push("AI Agent");
  }
  if (/transformer|上下文|context/i.test(userText)) {
    interests.push("大模型架构");
  }
  if (/rag|检索增强/i.test(userText)) {
    unknownTopics.push("RAG");
  }

  return { displayName: null, interests, knownTopics, unknownTopics, explanationStyle: null, habits: [] };
}

const EXPLANATION_RULES: Array<{ pattern: RegExp; style: string }> = [
  { pattern: /讲(?:得)?(?:细|詳)/, style: "详细分步，举例说明" },
  { pattern: /说人话|通俗/, style: "通俗中文 + 保留英文术语" },
  { pattern: /别太长|简短|简洁/, style: "简洁优先，点到为止" },
  { pattern: /保留英文|英文术语/, style: "通俗中文 + 保留英文术语" },
];

/** Parse user-side utterances from a formatted transcript. */
export function extractProfileSignalsFromTranscript(
  transcript: string,
): ProfileSignals {
  const userText = extractFromUserLines(transcript);
  if (!userText.trim()) {
    return {
      displayName: null,
      interests: [],
      knownTopics: [],
      unknownTopics: [],
      explanationStyle: null,
      habits: [],
    };
  }

  const keyword = inferKeywordSignals(userText);

  const interests = mergeUnique(keyword.interests, [
    ...collectMatches(
      userText,
      /(?:我对|我對|喜欢|喜歡|关注|關注)([^，。！？\n]{2,24})(?:很感兴趣|感興趣|比较感兴趣|挺感兴趣|感兴趣)?/,
    ),
    ...collectMatches(userText, /想(?:深入)?(?:了解|学|學)([^，。！？\n]{2,20})/),
  ]);

  const knownTopics = mergeUnique(keyword.knownTopics, [
    ...collectMatches(
      userText,
      /(?:我已经(?:会|會)|我(?:会|會)用|我懂|我熟悉|我知道)([^，。！？\n]{2,20})/,
    ),
  ]);

  const unknownTopics = mergeUnique(keyword.unknownTopics, [
    ...collectMatches(
      userText,
      /(?:不太懂|不懂|没听过|沒聽過|不太了解|不了解)([^，。！？\n]{2,20})/,
    ),
    ...collectMatches(userText, /(?:什么是|什麼是)([^，。！？\n]{2,20})/),
    ...collectMatches(userText, /(?:解释一下|解釋一下)([^，。！？\n]{2,20})/),
  ]);

  let explanationStyle: string | null = null;
  for (const rule of EXPLANATION_RULES) {
    if (rule.pattern.test(userText)) {
      explanationStyle = rule.style;
    }
  }

  const habits = mergeUnique([], [
    ...collectMatches(userText, /(每天早上[^，。！？\n]{0,16})/),
    ...collectMatches(userText, /(习惯(?:先|在|每天)[^，。！？\n]{2,24})/),
  ]);

  const nameMatch = userText.match(/我(?:叫|名字是)([^\s，。！？]{1,12})/);
  const displayName = nameMatch?.[1]?.trim() ?? null;

  return {
    displayName,
    interests,
    knownTopics,
    unknownTopics,
    explanationStyle,
    habits,
  };
}

export function mergeProfileSignals(
  current: ProfileSignals,
  incoming: ProfileSignals,
): ProfileSignals {
  return {
    displayName: incoming.displayName ?? current.displayName,
    interests: mergeUnique(current.interests, incoming.interests),
    knownTopics: mergeUnique(current.knownTopics, incoming.knownTopics),
    unknownTopics: mergeUnique(current.unknownTopics, incoming.unknownTopics),
    explanationStyle: incoming.explanationStyle ?? current.explanationStyle,
    habits: mergeUnique(current.habits, incoming.habits),
  };
}
