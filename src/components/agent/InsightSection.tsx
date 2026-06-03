import { useEffect, useMemo } from "react";
import { ProposalPreview } from "@/components/agent/ProposalPreview";
import { ResearchTrace } from "@/components/agent/ResearchTrace";
import { GlassCard } from "@/components/ui/GlassCard";
import { useProposalBatchPreview } from "@/hooks/useProposalBatchPreview";
import { useProposalStore } from "@/stores/proposalStore";
import { useResearchRunStore } from "@/stores/researchRunStore";
import { useGraphStore } from "@/stores/graphStore";

/** Insight nav partition — research trace + batch graph preview (B3). */
export function InsightSection() {
  const runs = useResearchRunStore((state) => state.runs);
  const selectedRunId = useResearchRunStore((state) => state.selectedRunId);
  const selectRun = useResearchRunStore((state) => state.selectRun);
  const pending = useProposalStore((state) => state.pending);
  const previewGhostNodes = useGraphStore((state) => state.previewGhostNodes);
  const highlightedNodeIds = useGraphStore((state) => state.highlightedNodeIds);
  const { previewBatch, clearPreview } = useProposalBatchPreview();

  const selectedRun = useMemo(
    () => runs.find((run) => run.runId === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId],
  );

  const batchEnvelopes = useMemo(() => {
    if (!selectedRun) {
      return [];
    }
    return pending.filter(
      (item) =>
        item.runId === selectedRun.runId && item.source === "research_loop",
    );
  }, [pending, selectedRun]);

  const previewActive =
    previewGhostNodes.length > 0 || highlightedNodeIds.length > 0;

  useEffect(() => {
    return () => {
      clearPreview();
    };
  }, [clearPreview]);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4"
      data-testid="section-insight"
    >
      <header>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
          分析洞察
        </p>
        <h2 className="text-h2 text-primary">调研轨迹</h2>
        <p className="mt-1 text-caption text-muted">
          查看自主研究链的执行步骤，并在确认前预览一批关联提议对星图的影响。
        </p>
      </header>

      {runs.length === 0 ? (
        <GlassCard
          className="flex flex-col items-center justify-center gap-2 p-8 text-center"
          data-testid="insight-empty"
        >
          <p className="text-h2 text-primary">暂无调研记录</p>
          <p className="text-caption text-muted">
            研究链 Job 运行后，轨迹会出现在这里（会话内，不落库）。
          </p>
        </GlassCard>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {runs.map((run) => (
              <button
                key={run.runId}
                type="button"
                onClick={() => selectRun(run.runId)}
                className={`rounded-sm border px-3 py-1.5 text-caption ${
                  (selectedRun?.runId ?? "") === run.runId
                    ? "border-accent-cyan text-primary"
                    : "border-hud text-secondary"
                }`}
              >
                {run.digest?.title ?? run.topic ?? run.runId}
              </button>
            ))}
          </div>

          {selectedRun ? (
            <>
              <GlassCard className="p-4">
                <ResearchTrace trace={selectedRun.trace} />
              </GlassCard>
              {batchEnvelopes.length > 0 ? (
                <ProposalPreview
                  runId={selectedRun.runId}
                  envelopes={batchEnvelopes}
                  active={previewActive}
                  onPreview={() => void previewBatch(batchEnvelopes)}
                  onClear={clearPreview}
                />
              ) : (
                <p className="text-caption text-muted">
                  该批次的待确认提议已处理完毕。
                </p>
              )}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
