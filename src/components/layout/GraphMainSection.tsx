import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { GraphHeader } from "@/components/brain/GraphHeader";
import { GraphStatsCard } from "@/components/brain/GraphStatsCard";
import { ManualGraphPanel } from "@/components/brain/ManualGraphPanel";
import { NewsIngestPanel } from "@/components/brain/NewsIngestPanel";

/** Live knowledge-graph partition (default nav section). */
export function GraphMainSection() {
  return (
    <section
      className="relative flex min-h-0 flex-col gap-2"
      data-testid="section-graph"
    >
      <GraphHeader />
      <div className="relative min-h-0 flex-1">
        <BrainGraphView />
        <GraphStatsCard />
        <ManualGraphPanel />
        <NewsIngestPanel />
      </div>
    </section>
  );
}
