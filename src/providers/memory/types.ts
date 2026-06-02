export interface MemoryItem {
  id?: string;
  kind: "episode" | "fact";
  /** Distilled plain text only — no raw audio, full articles, or secrets. */
  text: string;
  tags?: string[];
  timestamp: number;
}

export interface RecallQuery {
  query: string;
  topK?: number;
  kinds?: MemoryItem["kind"][];
}

export interface RecalledMemory {
  item: MemoryItem;
  score: number;
}

export interface MemoryHealth {
  ok: boolean;
  detail?: string;
}

export interface MemoryProvider {
  remember(items: MemoryItem[]): Promise<void>;
  recall(query: RecallQuery): Promise<RecalledMemory[]>;
  health(): Promise<MemoryHealth>;
}
