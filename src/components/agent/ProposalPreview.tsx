import type { ProposalEnvelope } from "@/agent/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { useUiStore } from "@/stores/uiStore";

interface ProposalPreviewProps {
  runId: string;
  envelopes: ProposalEnvelope[];
  onPreview: () => void;
  onClear: () => void;
  active: boolean;
}

/** Batch preview controls — highlights graph without persisting (B3). */
export function ProposalPreview({
  runId,
  envelopes,
  onPreview,
  onClear,
  active,
}: ProposalPreviewProps) {
  const setSection = useUiStore((state) => state.setSection);
  const linkCount = envelopes.filter((item) => item.proposal.kind === "link").length;
  const createCount = envelopes.filter(
    (item) => item.proposal.kind === "create",
  ).length;

  return (
    <GlassCard
      className="flex flex-col gap-3 p-4"
      data-testid={`proposal-preview-${runId}`}
    >
      <div>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-blue">
          关联提议预览
        </p>
        <p className="mt-1 text-body text-primary">
          {envelopes.length} 条待确认 · {createCount} 新建 · {linkCount} 关联
        </p>
        <p className="mt-1 text-caption text-muted">
          预览仅高亮/虚影展示，不会写入图谱；确认仍走收件箱。
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="proposal-preview-show-on-graph"
          onClick={onPreview}
          className="rounded-sm bg-accent-cyan px-3 py-1.5 text-caption font-medium text-bg-base"
        >
          {active ? "刷新预览" : "预览到星图"}
        </button>
        <button
          type="button"
          onClick={() => setSection("graph")}
          className="rounded-sm border border-hud px-3 py-1.5 text-caption text-primary"
        >
          查看星图
        </button>
        {active ? (
          <button
            type="button"
            data-testid="proposal-preview-clear"
            onClick={onClear}
            className="rounded-sm border border-hud px-3 py-1.5 text-caption text-secondary"
          >
            清除预览
          </button>
        ) : null}
      </div>
    </GlassCard>
  );
}
