import type {
  MemoryItem,
  MemoryProvider,
  RecallQuery,
  RecalledMemory,
} from "./types";

export interface EverMemOsProviderConfig {
  baseUrl: string;
  apiKey?: string;
  userId: string;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
}

const DEFAULT_TOP_K = 5;

function kindToMemoryTypes(kind: MemoryItem["kind"]): string[] {
  return kind === "fact" ? ["event_log"] : ["episodic_memory"];
}

function memoryTypesForRecall(kinds?: MemoryItem["kind"][]): string[] {
  if (!kinds?.length) {
    return ["episodic_memory", "event_log"];
  }
  const types = new Set<string>();
  for (const kind of kinds) {
    for (const mapped of kindToMemoryTypes(kind)) {
      types.add(mapped);
    }
  }
  return [...types];
}

function apiRoot(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

function healthUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const origin = trimmed.replace(/\/api\/v1$/, "");
  return `${origin}/health`;
}

function toIsoTime(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  for (const key of ["content", "text", "summary", "memory"]) {
    const field = record[key];
    if (typeof field === "string" && field.trim()) {
      return field.trim();
    }
  }
  return "";
}

function extractScore(value: unknown, fallback: number): number {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const record = value as Record<string, unknown>;
  for (const key of ["score", "relevance", "similarity"]) {
    const field = record[key];
    if (typeof field === "number" && Number.isFinite(field)) {
      return field;
    }
  }
  return fallback;
}

function parseSearchResults(payload: unknown): RecalledMemory[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const root = payload as Record<string, unknown>;
  const result = (root.result ?? root) as Record<string, unknown>;
  const groups = result.memories ?? result.data ?? result.items;
  if (!Array.isArray(groups)) {
    return [];
  }

  const recalled: RecalledMemory[] = [];
  for (const [index, group] of groups.entries()) {
    const text = extractText(group);
    if (!text) {
      continue;
    }
    const score = extractScore(group, Math.max(0.1, 1 - index * 0.05));
    recalled.push({
      item: {
        kind: "episode",
        text,
        timestamp: Date.now(),
      },
      score,
    });
  }
  return recalled;
}

/**
 * EverMemOS REST adapter (EverOS/EverCore).
 * Vendor surface is confined to this file per memory-boundary rule.
 */
export class EverMemOsProvider implements MemoryProvider {
  private readonly apiBase: string;
  private readonly healthEndpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly log: (message: string) => void;
  private readonly headers: Record<string, string>;
  private readonly userId: string;
  private pendingQueue: MemoryItem[] = [];
  private lastHealth: { ok: boolean; detail?: string } = { ok: false };

  constructor(config: EverMemOsProviderConfig) {
    this.apiBase = apiRoot(config.baseUrl);
    this.healthEndpoint = healthUrl(config.baseUrl);
    this.userId = config.userId;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.log = config.log ?? (() => undefined);
    this.headers = { "Content-Type": "application/json" };
    if (config.apiKey?.trim()) {
      this.headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    }
  }

  async health(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const response = await this.fetchImpl(this.healthEndpoint, {
        method: "GET",
        headers: this.headers,
      });
      if (!response.ok) {
        this.lastHealth = {
          ok: false,
          detail: `HTTP ${response.status}`,
        };
        return this.lastHealth;
      }
      const body = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const status = body.status;
      const ok = status === "healthy" || status === "ok" || response.ok;
      this.lastHealth = ok
        ? { ok: true }
        : { ok: false, detail: "sidecar unhealthy" };
      return this.lastHealth;
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "sidecar unreachable";
      this.lastHealth = { ok: false, detail };
      return this.lastHealth;
    }
  }

  async remember(items: MemoryItem[]): Promise<void> {
    const sanitized = items.filter((item) => item.text.trim());
    if (sanitized.length === 0) {
      return;
    }

    const health = await this.health();
    if (!health.ok) {
      this.pendingQueue.push(...sanitized);
      this.log(
        `[memory] EverMemOS unavailable (${health.detail ?? "unknown"}); queued ${sanitized.length} item(s)`,
      );
      return;
    }

    await this.flushPendingQueue();
    for (const item of sanitized) {
      await this.storeOne(item);
    }
  }

  async recall(query: RecallQuery): Promise<RecalledMemory[]> {
    const health = await this.health();
    if (!health.ok) {
      this.log(
        `[memory] recall skipped — sidecar unavailable (${health.detail ?? "unknown"})`,
      );
      return [];
    }

    try {
      const response = await this.fetchImpl(`${this.apiBase}/memories/search`, {
        method: "GET",
        headers: this.headers,
        body: JSON.stringify({
          query: query.query,
          user_id: this.userId,
          retrieve_method: "hybrid",
          memory_types: memoryTypesForRecall(query.kinds),
          top_k: query.topK ?? DEFAULT_TOP_K,
        }),
      });

      if (!response.ok) {
        this.log(`[memory] recall HTTP ${response.status}`);
        return [];
      }

      const payload = await response.json().catch(() => null);
      return parseSearchResults(payload);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "recall request failed";
      this.log(`[memory] recall failed: ${detail}`);
      return [];
    }
  }

  /** Visible for tests — pending items when sidecar was down. */
  pendingCount(): number {
    return this.pendingQueue.length;
  }

  private async flushPendingQueue(): Promise<void> {
    if (this.pendingQueue.length === 0) {
      return;
    }
    const batch = [...this.pendingQueue];
    this.pendingQueue = [];
    for (const item of batch) {
      await this.storeOne(item);
    }
  }

  private async storeOne(item: MemoryItem): Promise<void> {
    try {
      const messageId =
        item.id ??
        `my-brain-${item.kind}-${item.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      const response = await this.fetchImpl(`${this.apiBase}/memories`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          message_id: messageId,
          create_time: toIsoTime(item.timestamp),
          sender: this.userId,
          content: item.text,
          memory_types: kindToMemoryTypes(item.kind),
          tags: item.tags,
        }),
      });
      if (!response.ok) {
        this.log(`[memory] remember HTTP ${response.status}`);
        this.pendingQueue.push(item);
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "remember request failed";
      this.log(`[memory] remember failed: ${detail}`);
      this.pendingQueue.push(item);
    }
  }
}

export function createEverMemOsProvider(
  config: EverMemOsProviderConfig,
): MemoryProvider {
  return new EverMemOsProvider(config);
}
