import type { GraphMutationProposal } from "@/domain/graph";

const KIND_LABELS: Record<GraphMutationProposal["kind"], string> = {
  create: "新建概念",
  attach: "补充概念",
  merge: "合并概念",
  archive: "归档概念",
  link: "建立关联",
  update: "更新概念",
};

export interface SuggestConfirmDialogProps {
  open: boolean;
  proposals: GraphMutationProposal[];
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
  confirmLabel?: string;
}

/** Product invariant UI: every graph mutation is suggest-then-confirm. */
export function SuggestConfirmDialog({
  open,
  proposals,
  onConfirm,
  onCancel,
  isBusy = false,
  confirmLabel = "确认入库",
}: SuggestConfirmDialogProps) {
  if (!open || proposals.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggest-confirm-title"
    >
      <div className="glass-card glass-card-active w-full max-w-md p-6 shadow-glow-cyan">
        <p className="font-hud text-label uppercase tracking-hud text-accent-cyan">
          图谱变更建议
        </p>
        <h3 id="suggest-confirm-title" className="mt-2 text-h2 font-medium text-primary">
          确认后再写入大脑
        </h3>
        <p className="mt-2 text-caption text-muted">
          {proposals.length > 1
            ? `共 ${proposals.length} 步变更，将按顺序执行`
            : "确认本条变更；拒绝则不会写入大脑"}
        </p>

        <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto">
          {proposals.map((proposal, index) => (
            <li
              key={proposal.id}
              className="rounded-md border border-hud bg-bg-elevated/50 p-3"
            >
              <div className="flex items-center gap-2">
                {proposals.length > 1 ? (
                  <span className="font-hud text-caption text-muted">
                    {index + 1}/{proposals.length}
                  </span>
                ) : null}
                <span className="font-hud text-caption uppercase tracking-hud text-accent-blue">
                  {KIND_LABELS[proposal.kind]}
                </span>
              </div>
              <p className="mt-1 text-body text-primary">{proposal.summary}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="rounded-sm border border-hud px-4 py-2 text-body text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
            className="rounded-sm bg-accent-cyan px-4 py-2 text-body font-medium text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isBusy ? "写入中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
