export type WorldItemKind = "ai_news" | "github_trending" | "release" | "blog" | "rss";

export type WorldItemStatus = "active" | "expired" | "superseded";

export interface DedupeKey {
  canonicalUrl: string | null;
  contentHash: string;
}

export interface WorldItem {
  id: string;
  kind: WorldItemKind;
  title: string;
  summary: string;
  sourceUrl: string | null;
  contentHash: string;
  fetchedAt: string;
  expiresAt: string;
  status: WorldItemStatus;
  duplicateOf: string | null;
  sourceName?: string;
  sourceItemId?: string;
}

export type WorldItemInput = Omit<
  WorldItem,
  "contentHash" | "expiresAt" | "status" | "duplicateOf"
> &
  Partial<Pick<WorldItem, "contentHash" | "expiresAt" | "status" | "duplicateOf">>;

export const WORLD_ITEM_DEFAULT_TTL_MS = 72 * 60 * 60 * 1000;

const WORLD_ITEM_KINDS = new Set<WorldItemKind>([
  "ai_news",
  "github_trending",
  "release",
  "blog",
  "rss",
]);

const WORLD_ITEM_STATUSES = new Set<WorldItemStatus>([
  "active",
  "expired",
  "superseded",
]);

export function addWorldItemTtl(
  fetchedAt: string,
  ttlMs: number = WORLD_ITEM_DEFAULT_TTL_MS,
): string {
  const fetchedTime = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedTime)) {
    throw new Error(`Invalid WorldItem fetchedAt: ${fetchedAt}`);
  }
  return new Date(fetchedTime + ttlMs).toISOString();
}

export function isWorldItemExpired(item: Pick<WorldItem, "expiresAt">, now: string): boolean {
  const expiresTime = Date.parse(item.expiresAt);
  const nowTime = Date.parse(now);
  if (!Number.isFinite(expiresTime) || !Number.isFinite(nowTime)) {
    throw new Error("Invalid WorldItem expiry comparison timestamp");
  }
  return expiresTime < nowTime;
}

export function normalizeSourceUrl(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) {
    return null;
  }

  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    url.hash = "";
    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return trimmed;
  }
}

export function normalizeWorldItem(input: WorldItemInput): WorldItem {
  const sourceUrl = normalizeSourceUrl(input.sourceUrl);
  const fetchedAt = normalizeIsoTimestamp(input.fetchedAt, "fetchedAt");
  const expiresAt = input.expiresAt
    ? normalizeIsoTimestamp(input.expiresAt, "expiresAt")
    : addWorldItemTtl(fetchedAt);
  const base = {
    id: input.id.trim(),
    kind: input.kind,
    title: input.title.trim(),
    summary: input.summary.trim(),
    sourceUrl,
    fetchedAt,
    expiresAt,
    status: input.status ?? "active",
    duplicateOf: input.duplicateOf ?? null,
    sourceName: input.sourceName?.trim(),
    sourceItemId: input.sourceItemId?.trim(),
  };

  const contentHash =
    input.contentHash?.trim() || hashWorldItemContent(base.title, base.summary, base.sourceUrl);

  return {
    ...base,
    contentHash,
  };
}

export function getWorldItemDedupeKey(item: Pick<WorldItem, "sourceUrl" | "contentHash">): DedupeKey {
  return {
    canonicalUrl: normalizeSourceUrl(item.sourceUrl),
    contentHash: item.contentHash,
  };
}

export function hashWorldItemContent(
  title: string,
  summary: string,
  sourceUrl: string | null,
): string {
  return sha256Hex(
    JSON.stringify({
      title: title.trim(),
      summary: summary.trim(),
      sourceUrl: normalizeSourceUrl(sourceUrl),
    }),
  );
}

export function getWorldItemValidationErrors(candidate: unknown): string[] {
  if (!isRecord(candidate)) {
    return ["WorldItem must be an object"];
  }

  const errors: string[] = [];
  requireString(candidate, "id", errors);
  if (!isWorldItemKind(candidate.kind)) {
    errors.push("kind must be a valid WorldItemKind");
  }
  requireString(candidate, "title", errors);
  requireString(candidate, "summary", errors);
  if (candidate.sourceUrl !== null && typeof candidate.sourceUrl !== "string") {
    errors.push("sourceUrl must be string or null");
  }
  requireString(candidate, "contentHash", errors);
  requireIsoTimestamp(candidate, "fetchedAt", errors);
  requireIsoTimestamp(candidate, "expiresAt", errors);
  if (!isWorldItemStatus(candidate.status)) {
    errors.push("status must be a valid WorldItemStatus");
  }
  if (candidate.duplicateOf !== null && typeof candidate.duplicateOf !== "string") {
    errors.push("duplicateOf must be string or null");
  }
  if (typeof candidate.contentHash === "string" && !/^[a-f0-9]{64}$/.test(candidate.contentHash)) {
    errors.push("contentHash must be a lowercase SHA-256 hex string");
  }

  return errors;
}

export function isWorldItem(candidate: unknown): candidate is WorldItem {
  return getWorldItemValidationErrors(candidate).length === 0;
}

export function assertWorldItem(candidate: unknown): asserts candidate is WorldItem {
  const errors = getWorldItemValidationErrors(candidate);
  if (errors.length > 0) {
    throw new Error(`Invalid WorldItem: ${errors.join("; ")}`);
  }
}

function normalizeIsoTimestamp(value: string, field: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid WorldItem ${field}: ${value}`);
  }
  return new Date(parsed).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(
  candidate: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (typeof candidate[field] !== "string" || candidate[field] === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

function requireIsoTimestamp(
  candidate: Record<string, unknown>,
  field: string,
  errors: string[],
): void {
  if (typeof candidate[field] !== "string" || !Number.isFinite(Date.parse(candidate[field]))) {
    errors.push(`${field} must be a valid ISO timestamp`);
  }
}

function isWorldItemKind(value: unknown): value is WorldItemKind {
  return typeof value === "string" && WORLD_ITEM_KINDS.has(value as WorldItemKind);
}

function isWorldItemStatus(value: unknown): value is WorldItemStatus {
  return typeof value === "string" && WORLD_ITEM_STATUSES.has(value as WorldItemStatus);
}

function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i]! << (24 - (i % 4) * 8));
  }
  words[bytes.length >> 2] =
    (words[bytes.length >> 2] ?? 0) | (0x80 << (24 - (bytes.length % 4) * 8));
  words[(((bytes.length + 8) >> 6) << 4) + 15] = bytes.length * 8;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let offset = 0; offset < words.length; offset += 16) {
    for (let i = 0; i < 16; i++) {
      w[i] = words[offset + i] ?? 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotateRight(w[i - 15]!, 7) ^ rotateRight(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotateRight(w[i - 2]!, 17) ^ rotateRight(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = add32(w[i - 16]!, s0, w[i - 7]!, s1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = add32(h, s1, ch, SHA256_K[i]!, w[i]!);
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = add32(s0, maj);
      h = g;
      g = f;
      f = e;
      e = add32(d, temp1);
      d = c;
      c = b;
      b = a;
      a = add32(temp1, temp2);
    }

    h0 = add32(h0, a);
    h1 = add32(h1, b);
    h2 = add32(h2, c);
    h3 = add32(h3, d);
    h4 = add32(h4, e);
    h5 = add32(h5, f);
    h6 = add32(h6, g);
    h7 = add32(h7, h);
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function add32(...values: number[]): number {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0);
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
  0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
  0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
  0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
  0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
];
