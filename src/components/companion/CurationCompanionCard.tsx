import { useCallback, useMemo, useState } from "react";
import { curationKindLabelZh } from "@/lib/curationKindLabel";
import { formatEdgeMigrationSummary } from "@/lib/graphHistoryMeta";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

export interface CurationCompanionCardProps {
  /** Opens Weekly Review body in companion review slot (KP-03 main path). */
  onOpenReview?: () => void;
}

/**
 * KP-03: post-ingest / auto-curate report inside companion shell.
 * Shows curation details + Review entry CTA — not the full Weekly body.
 */
export function CurationCompanionCard({ onOpenReview }: CurationCompanionCardProps) {
  const storage = useAppStore((state) => state.storage);
  const reportEntryId = useGraphHistoryStore((state) => state.reportEntryId);
  const entries = useGraphHistoryStore((state) => state.entries);
  const persistWarning = useGraphHistoryStore((state) => state.persistWarning);
  const lastUndoError = useGraphHistoryStore((state) => state.lastUndoError);
  const dismissReport = useGraphHistoryStore((state) => state.dismissReport);
  const undo = useGraphHistoryStore((state) => state.undo);
  const clearUndoError = useGraphHistoryStore((state) => state.clearUndoError);
  const [busy, setBusy] = useState(false);

  const entry = useMemo(
    () => entries.find((row) => row.id === reportEntryId) ?? null,
    [entries, reportEntryId],
  );

  const onUndo = useCallback(async () => {
    if (!storage || !entry || entry.undone || busy) {
      return;
    }
    setBusy(true);
    clearUndoError();
    try {
      await undo(storage, entry.id);
    } finally {
      setBusy(false);
    }
  }, [storage, entry, busy, undo, clearUndoError]);

  if (!entry) {
    return (
      <div data-testid="curation-companion-card" className="text-body text-secondary">
        <p>暂无整理报告</p>
      </div>
    );
  }

  const canUndo = !entry.undone;
  const migrationSummary = formatEdgeMigrationSummary(entry);

  return (
    <div data-testid="curation-companion-card" className="flex flex-col gap-3">
      <div>
        <p className="text-caption uppercase tracking-wide text-cyan-300/80">
          自动整理
        </p>
        <h3
          data-testid="curation-companion-summary"
          className="mt-1 text-h3 text-primary"
        >
          {entry.summary}
        </h3>
      </div>

      <dl className="grid gap-2 text-caption text-secondary">
        <div className="flex gap-2">
          <dt className="shrink-0 text-tertiary">操作类型</dt>
          <dd data-testid="curation-companion-kind">{curationKindLabelZh(entry.kind)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-tertiary">原因码</dt>
          <dd data-testid="curation-companion-reason-code">{entry.reasonCode}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <dt className="shrink-0 text-tertiary">原因说明</dt>
          <dd data-testid="curation-companion-reason-detail">{entry.reasonDetail}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <dt className="shrink-0 text-tertiary">受影响节点</dt>
          <dd data-testid="curation-companion-affected-nodes">
            {entry.affectedNodeIds.join(", ")}
          </dd>
        </div>
        {migrationSummary ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <dt className="shrink-0 text-tertiary">边迁移</dt>
            <dd data-testid="curation-companion-edge-migrations">{migrationSummary}</dd>
          </div>
        ) : null}
      </dl>

      {persistWarning ? (
        <p
          data-testid="curation-companion-persist-warning"
          className="text-caption text-status-warn"
        >
          变更未持久化，重启后无法撤销
        </p>
      ) : null}

      {lastUndoError ? (
        <p
          data-testid="curation-companion-undo-error"
          role="alert"
          className="text-caption text-status-error"
        >
          {lastUndoError}
        </p>
      ) : null}

      <p className="text-caption text-tertiary">
        撤销整理不会删除你已确认入库的概念节点。
      </p>

      <div className="flex flex-wrap gap-2">
        {canUndo ? (
          <button
            type="button"
            data-testid="curation-companion-undo"
            disabled={busy}
            onClick={() => void onUndo()}
            className="rounded-full border border-hud bg-bg-base/80 px-3 py-1.5 text-caption text-primary transition hover:border-accent-cyan/50 disabled:opacity-50"
          >
            撤销这次整理
          </button>
        ) : (
          <span
            data-testid="curation-companion-undone-badge"
            className="rounded-full border border-hud/60 px-3 py-1 text-caption text-tertiary"
          >
            已撤销
          </span>
        )}
      </div>

      {onOpenReview ? (
        <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-950/30 p-3">
          <p className="text-caption text-secondary">
            整理已写入图谱历史。可按时间窗口查看每周脑图回顾（只读汇总，不会改图谱）。
          </p>
          <button
            type="button"
            data-testid="companion-review-entry-cta"
            onClick={onOpenReview}
            className="mt-2 rounded-full border border-emerald-500/50 bg-emerald-950/50 px-3 py-1.5 text-caption text-emerald-100 transition hover:border-emerald-400/70"
          >
            查看每周脑图回顾
          </button>
        </div>
      ) : null}

      <button
        type="button"
        data-testid="curation-companion-dismiss"
        onClick={() => {
          dismissReport();
          clearUndoError();
        }}
        className="self-start text-caption text-muted transition hover:text-secondary"
      >
        关闭整理报告
      </button>
    </div>
  );
}
