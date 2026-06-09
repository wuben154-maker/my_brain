import {
  getWorldItemDedupeKey,
  isWorldItemExpired,
  normalizeWorldItem,
  type DedupeKey,
  type WorldItem,
  type WorldItemInput,
} from "@/domain/radar/worldItem";

export interface WorldItemUpsertResult {
  item: WorldItem;
  duplicateOf: string | null;
  inserted: boolean;
}

export class WorldItemStore {
  private readonly items = new Map<string, WorldItem>();

  upsert(input: WorldItemInput | WorldItem): WorldItemUpsertResult {
    const normalized = normalizeWorldItem(input);
    const canonical = this.findCanonicalDuplicate(normalized);
    const existing = this.items.get(normalized.id);
    const item: WorldItem = canonical
      ? {
          ...normalized,
          status: "superseded",
          duplicateOf: canonical.id,
        }
      : {
          ...normalized,
          status: normalized.status === "superseded" ? "active" : normalized.status,
          duplicateOf: null,
        };

    this.items.set(item.id, item);
    return {
      item,
      duplicateOf: item.duplicateOf,
      inserted: !existing,
    };
  }

  upsertMany(inputs: Array<WorldItemInput | WorldItem>): WorldItemUpsertResult[] {
    return inputs.map((item) => this.upsert(item));
  }

  expire(now: string): WorldItem[] {
    const expired: WorldItem[] = [];
    for (const item of this.items.values()) {
      if (item.status === "active" && isWorldItemExpired(item, now)) {
        const next: WorldItem = { ...item, status: "expired" };
        this.items.set(item.id, next);
        expired.push(next);
      }
    }
    return expired;
  }

  dedupe(): WorldItem[] {
    const seen = new Map<string, WorldItem>();
    const updated: WorldItem[] = [];

    for (const item of this.items.values()) {
      if (item.status === "expired") {
        continue;
      }
      const key = dedupeKeyToStrings(getWorldItemDedupeKey(item));
      const duplicate = key
        .map((value) => seen.get(value))
        .find((candidate): candidate is WorldItem => Boolean(candidate));

      if (duplicate) {
        const next: WorldItem = {
          ...item,
          status: "superseded",
          duplicateOf: duplicate.id,
        };
        this.items.set(item.id, next);
        updated.push(next);
        continue;
      }

      const canonical = item.status === "superseded" ? { ...item, status: "active" as const } : item;
      this.items.set(canonical.id, canonical);
      for (const value of key) {
        seen.set(value, canonical);
      }
    }

    return updated;
  }

  listActive(): WorldItem[] {
    return this.listAll().filter((item) => item.status === "active");
  }

  listAll(): WorldItem[] {
    return Array.from(this.items.values());
  }

  get(id: string): WorldItem | undefined {
    return this.items.get(id);
  }

  clear(): void {
    this.items.clear();
  }

  private findCanonicalDuplicate(item: WorldItem): WorldItem | null {
    const key = dedupeKeyToStrings(getWorldItemDedupeKey(item));
    for (const candidate of this.items.values()) {
      if (candidate.id === item.id || candidate.status === "superseded") {
        continue;
      }
      const candidateKey = dedupeKeyToStrings(getWorldItemDedupeKey(candidate));
      if (key.some((value) => candidateKey.includes(value))) {
        return candidate.duplicateOf ? (this.items.get(candidate.duplicateOf) ?? candidate) : candidate;
      }
    }
    return null;
  }
}

export function createWorldItemStore(): WorldItemStore {
  return new WorldItemStore();
}

function dedupeKeyToStrings(key: DedupeKey): string[] {
  return [key.canonicalUrl ? `url:${key.canonicalUrl}` : null, `hash:${key.contentHash}`].filter(
    (value): value is string => Boolean(value),
  );
}
