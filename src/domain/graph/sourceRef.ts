import type { ConceptNode } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import type { BriefingItem } from "@/domain/radar/briefingItem";
import type { WorldItem } from "@/domain/radar/worldItem";

export type SourceRefKind =
  | "briefing"
  | "manual"
  | "news"
  | "github"
  | "world";

export interface SourceRef {
  url: string | null;
  title: string;
  kind: SourceRefKind;
  worldItemId?: string;
  ingestedAt: string;
}

const SOURCE_REF_KINDS = new Set<SourceRefKind>([
  "briefing",
  "manual",
  "news",
  "github",
  "world",
]);

export function normalizeSourceRefUrl(
  sourceUrl: string | null | undefined,
): string | null {
  if (!sourceUrl) {
    return null;
  }
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeSourceRef(raw: unknown): SourceRef | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const title = String(record.title ?? "").trim();
  const ingestedAt = String(record.ingestedAt ?? "").trim();
  if (!title || !ingestedAt) {
    return null;
  }
  const kindRaw = String(record.kind ?? "manual");
  const kind = SOURCE_REF_KINDS.has(kindRaw as SourceRefKind)
    ? (kindRaw as SourceRefKind)
    : "manual";
  const url = normalizeSourceRefUrl(
    record.url === null || record.url === undefined
      ? null
      : String(record.url),
  );
  const worldItemId =
    typeof record.worldItemId === "string" && record.worldItemId.trim().length > 0
      ? record.worldItemId.trim()
      : undefined;
  return {
    url,
    title,
    kind: url === null ? "manual" : kind,
    ...(worldItemId ? { worldItemId } : {}),
    ingestedAt,
  };
}

export function normalizeSourceRefs(refs: unknown): SourceRef[] {
  if (!Array.isArray(refs)) {
    return [];
  }
  const normalized: SourceRef[] = [];
  for (const item of refs) {
    const ref = normalizeSourceRef(item);
    if (ref) {
      normalized.push(ref);
    }
  }
  if (normalized.length > 0) {
    return normalized;
  }
  return [];
}

export function sourceRefFromLegacySourceUrl(
  node: Pick<ConceptNode, "title" | "sourceUrl" | "updatedAt" | "createdAt">,
): SourceRef | null {
  const url = normalizeSourceRefUrl(node.sourceUrl);
  if (!url) {
    return null;
  }
  return {
    url,
    title: node.title,
    kind: "manual",
    ingestedAt: node.updatedAt ?? node.createdAt,
  };
}

export function migrateLegacySourceUrlToSourceRefs(
  node: ConceptNode,
): SourceRef[] {
  if ((node.sourceRefs?.length ?? 0) > 0) {
    return node.sourceRefs ?? [];
  }
  const legacy = sourceRefFromLegacySourceUrl(node);
  return legacy ? [legacy] : [];
}

export function syncLegacySourceUrl(
  sourceRefs: SourceRef[],
  sourceUrl: string | null | undefined,
): string | null {
  if (sourceRefs.length > 0) {
    return sourceRefs[0]?.url ?? null;
  }
  return normalizeSourceRefUrl(sourceUrl);
}

/** Ensures every node has explicit `sourceRefs` and legacy `sourceUrl` stays in sync. */
export function normalizeConceptProvenance(node: ConceptNode): ConceptNode {
  const sourceRefs = migrateLegacySourceUrlToSourceRefs({
    ...node,
    sourceRefs: node.sourceRefs,
  });
  return {
    ...node,
    sourceRefs,
    sourceUrl: syncLegacySourceUrl(sourceRefs, node.sourceUrl),
  };
}

export function serializeSourceRefsJson(sourceRefs: SourceRef[]): string {
  return JSON.stringify(sourceRefs);
}

export function parseSourceRefsJson(json: string | null | undefined): SourceRef[] {
  if (!json || json.trim().length === 0) {
    return [];
  }
  try {
    return normalizeSourceRefs(JSON.parse(json) as unknown);
  } catch {
    return [];
  }
}

export function buildSourceRefFromNewsItem(
  item: NewsItem,
  options: {
    ingestedAt: string;
    worldItemId?: string;
    kind?: SourceRefKind;
  },
): SourceRef {
  const url = normalizeSourceRefUrl(item.sourceUrl);
  return {
    url,
    title: item.title,
    kind: url === null ? "manual" : (options.kind ?? "briefing"),
    ...(options.worldItemId ? { worldItemId: options.worldItemId } : {}),
    ingestedAt: options.ingestedAt,
  };
}

export function buildSourceRefFromWorldItem(
  item: WorldItem,
  options: { ingestedAt: string; kind?: SourceRefKind },
): SourceRef {
  const url = normalizeSourceRefUrl(item.sourceUrl);
  return {
    url,
    title: item.title,
    kind: url === null ? "manual" : (options.kind ?? "world"),
    worldItemId: item.id,
    ingestedAt: options.ingestedAt,
  };
}

export function buildSourceRefFromBriefingItem(
  item: BriefingItem,
  options: { ingestedAt: string },
): SourceRef {
  return buildSourceRefFromWorldItem(item.worldItem, {
    ingestedAt: options.ingestedAt,
    kind: "briefing",
  });
}

export function sourceRefsEqual(a: SourceRef[], b: SourceRef[]): boolean {
  return serializeSourceRefsJson(a) === serializeSourceRefsJson(b);
}
