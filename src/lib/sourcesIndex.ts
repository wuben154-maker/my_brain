import type { ConceptNode } from "@/domain/graph";

export interface SourceDomainGroup {
  domain: string;
  items: ConceptNode[];
}

/** Visible concepts that carry an external source link (N2). */
export function filterSourcedConcepts(nodes: ConceptNode[]): ConceptNode[] {
  return nodes.filter(
    (node) => !node.archived && typeof node.sourceUrl === "string" && node.sourceUrl.trim() !== "",
  );
}

export function sourceDomainFromUrl(sourceUrl: string): string {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "");
    return host || "unknown";
  } catch {
    return "invalid-url";
  }
}

function compareNodesByRecency(a: ConceptNode, b: ConceptNode): number {
  const aTime = Date.parse(a.updatedAt) || 0;
  const bTime = Date.parse(b.updatedAt) || 0;
  if (bTime !== aTime) {
    return bTime - aTime;
  }
  return a.title.localeCompare(b.title, "zh-CN");
}

/** Aggregate sourced concepts by domain for the docs library partition. */
export function indexSourcesByDomain(nodes: ConceptNode[]): SourceDomainGroup[] {
  const sourced = filterSourcedConcepts(nodes);
  const byDomain = new Map<string, ConceptNode[]>();

  for (const node of sourced) {
    const domain = sourceDomainFromUrl(node.sourceUrl ?? "");
    const bucket = byDomain.get(domain) ?? [];
    bucket.push(node);
    byDomain.set(domain, bucket);
  }

  return [...byDomain.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([domain, items]) => ({
      domain,
      items: [...items].sort(compareNodesByRecency),
    }));
}

export function countSourcedConcepts(nodes: ConceptNode[]): number {
  return filterSourcedConcepts(nodes).length;
}
