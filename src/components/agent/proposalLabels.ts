import type { GraphMutationProposal } from "@/domain/graph";
import type { ProposalSource } from "@/agent/types";

export const PROPOSAL_KIND_LABELS: Record<GraphMutationProposal["kind"], string> =
  {
    create: "新建概念",
    attach: "补充概念",
    merge: "合并概念",
    archive: "归档概念",
    link: "建立关联",
    update: "更新概念",
  };

export const PROPOSAL_SOURCE_LABELS: Record<ProposalSource, string> = {
  voice: "语音",
  background_ingest: "晨间简报",
  research_loop: "调研链",
  profile_suggestion: "画像建议",
};
