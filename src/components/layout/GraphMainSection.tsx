import { ProposalInbox } from "@/components/agent/ProposalInbox";
import { BrainGraph3DView } from "@/components/brain/BrainGraph3DView";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { GraphHeader } from "@/components/brain/GraphHeader";
import { useEffectiveGraphViewMode } from "@/lib/graphViewMode";
import { GraphStatsCard } from "@/components/brain/GraphStatsCard";
import { ManualGraphPanel } from "@/components/brain/ManualGraphPanel";
import { NewsIngestPanel } from "@/components/brain/NewsIngestPanel";
import { useAgentInboxStore } from "@/stores/agentInboxStore";

/** Live knowledge-graph partition (default nav section). */
export function GraphMainSection() {
  const inboxOpen = useAgentInboxStore((state) => state.inboxOpen);
  const setInboxOpen = useAgentInboxStore((state) => state.setInboxOpen);
  const graphViewMode = useEffectiveGraphViewMode();

  return (
    <section
      className="relative flex min-h-0 flex-col gap-2"
      data-testid="section-graph"
    >
      <GraphHeader />
      <div className="relative min-h-0 flex-1">
        {graphViewMode === "3d" ? <BrainGraph3DView /> : <BrainGraphView />}
        <GraphStatsCard />
        <ManualGraphPanel />
        <NewsIngestPanel />
      </div>
      <ProposalInbox open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </section>
  );
}
