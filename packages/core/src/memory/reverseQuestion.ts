import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import type { GraphEdge, GraphNode } from "../graph/types.js";
import { nodeRef } from "./evidence.js";
import { recordReplayQuery } from "./replayQueryAudit.js";
import type {
  M5EvidenceBundle,
  ReverseQuestionOutputKind,
  ReverseQuestionResult,
} from "./types.js";

function questionKindForMode(mode: UserMode): ReverseQuestionOutputKind {
  const map: Record<UserMode, ReverseQuestionOutputKind> = {
    tech_tracker: "relation_why",
    learner: "deepen_concept",
    creator_researcher: "systemize_material",
    founder_project: "next_step",
    personal_memory: "recall_day",
  };
  return map[mode];
}

function deterministicIndex(seed: string, length: number): number {
  if (length <= 0) {
    return 0;
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function promptForKind(
  kind: ReverseQuestionOutputKind,
  node: GraphNode,
  related?: GraphNode,
): string {
  switch (kind) {
    case "relation_why":
      return related
        ? `「${node.concept}」和「${related.concept}」为何相关？`
        : `「${node.concept}」最近为何值得跟进？`;
    case "deepen_concept":
      return `你还想深聊哪个概念？先从「${node.concept}」开始？`;
    case "systemize_material":
      return `这组素材如何成体系？「${node.concept}」能当主线吗？`;
    case "next_step":
      return `下一步该推进哪条？「${node.concept}」还是别的节点？`;
    case "recall_day":
      return `那天你记下了什么？「${node.concept}」还鲜活吗？`;
    case "mixed":
      return `想从「${node.concept}」继续聊吗？`;
    default:
      return `想从「${node.concept}」继续聊吗？`;
  }
}

export function buildReverseQuestion(
  profile: UserModeProfile,
  bundle: M5EvidenceBundle,
  seed = "m5-default",
): ReverseQuestionResult {
  const visibleNodes = bundle.nodes.filter((n) => !n.archived);
  if (visibleNodes.length === 0) {
    return {
      visible: false,
      outputKind: questionKindForMode(profile.primaryMode),
      prompt: "",
      evidenceRefs: [],
      nodeIds: [],
    };
  }

  recordReplayQuery("node_lookup_by_id", `SELECT id FROM graph_nodes WHERE archived=0 LIMIT 1`);
  const primaryIndex = deterministicIndex(
    `${seed}:${profile.primaryMode}`,
    visibleNodes.length,
  );
  const primary = visibleNodes[primaryIndex]!;
  const outputKind = questionKindForMode(profile.primaryMode);

  let related: GraphNode | undefined;
  if (bundle.edges.length > 0) {
    const edge = bundle.edges.find(
      (e) => e.fromId === primary.id || e.toId === primary.id,
    );
    if (edge) {
      const otherId = edge.fromId === primary.id ? edge.toId : edge.fromId;
      related = visibleNodes.find((n) => n.id === otherId);
      recordReplayQuery(
        "node_lookup_by_id",
        `SELECT id FROM graph_nodes WHERE id = ${otherId}`,
      );
    }
  }

  const evidenceRefs = [nodeRef(primary.id)];
  if (related) {
    evidenceRefs.push(nodeRef(related.id));
  }

  return {
    visible: true,
    outputKind,
    prompt: promptForKind(outputKind, primary, related),
    evidenceRefs,
    nodeIds: related ? [primary.id, related.id] : [primary.id],
  };
}
