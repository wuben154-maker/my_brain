import type { BrainGraphSnapshot } from "@/domain/graph";
import { rankLowSalienceCandidates } from "@/lib/salience";

export interface StaleFinding {
  nodeId: string;
  reason: string;
  migrateToNodeId?: string;
}

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 1);
}

function titleOverlapRatio(a: string, b: string): number {
  const tokensA = new Set(tokenizeTitle(a));
  const tokensB = new Set(tokenizeTitle(b));
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      shared += 1;
    }
  }
  return shared / Math.min(tokensA.size, tokensB.size);
}

const OVERLAP_THRESHOLD = 0.75;

export function detectStaleNodes(
  graph: BrainGraphSnapshot,
  now: Date,
  staleDays: number,
): StaleFinding[] {
  const active = graph.nodes.filter((node) => !node.archived);
  const byId = new Map(active.map((node) => [node.id, node]));
  const findings = new Map<string, StaleFinding>();

  const add = (finding: StaleFinding) => {
    if (!byId.has(finding.nodeId)) {
      return;
    }
    if (!findings.has(finding.nodeId)) {
      findings.set(finding.nodeId, finding);
    }
  };

  for (const edge of graph.edges) {
    if (edge.relationType !== "replaces") {
      continue;
    }
    const target = byId.get(edge.targetId);
    const source = byId.get(edge.sourceId);
    if (!target || !source) {
      continue;
    }
    add({
      nodeId: target.id,
      reason: `已被「${source.title}」取代（replaces 关系）`,
      migrateToNodeId: source.id,
    });
  }

  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  for (const node of active) {
    const ageMs = nowMs - Date.parse(node.updatedAt);
    if (Number.isFinite(ageMs) && ageMs >= staleMs) {
      add({
        nodeId: node.id,
        reason: `超过 ${staleDays} 天未更新`,
      });
    }
  }

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const left = active[i];
      const right = active[j];
      if (titleOverlapRatio(left.title, right.title) < OVERLAP_THRESHOLD) {
        continue;
      }
      const older =
        Date.parse(left.updatedAt) <= Date.parse(right.updatedAt) ? left : right;
      const newer = older.id === left.id ? right : left;
      add({
        nodeId: older.id,
        reason: `与「${newer.title}」高度重叠，建议合并归档`,
        migrateToNodeId: newer.id,
      });
    }
  }

  for (const candidate of rankLowSalienceCandidates(graph, nowMs, [], {
    limit: active.length,
    maxSalience: 0.4,
  })) {
    add({
      nodeId: candidate.nodeId,
      reason: candidate.reason,
    });
  }

  return [...findings.values()];
}
