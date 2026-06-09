import { useCallback, useEffect, useMemo, useState } from "react";
import { curationKindLabelZh } from "@/lib/curationKindLabel";
import { formatEdgeMigrationSummary } from "@/lib/graphHistoryMeta";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

const AUTO_DISMISS_MS = 5_000;

/** Post auto-curate report with reason fields and undo (KOS-A3). */
export function CurationReportOverlay() {
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

  useEffect(() => {
    if (!entry || isShowcaseDemoMode()) {
      return;
    }
    const timer = window.setTimeout(() => dismissReport(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [entry, dismissReport]);

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

  const onClose = useCallback(() => {
    dismissReport();
    clearUndoError();
  }, [dismissReport, clearUndoError]);

  if (!entry) {
    return null;
  }

  const canUndo = !entry.undone;
  const migrationSummary = formatEdgeMigrationSummary(entry);

  return (
    <div
      data-testid="curation-report-overlay"
      role="region"
      aria-label="整理报告"
      className="pointer-events-auto absolute inset-x-4 bottom-4 z-30 mx-auto max-w-xl rounded-lg border border-cyan-500/35 bg-bg-elevated/90 p-4 text-body shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-wide text-cyan-300/80">
            自动整理
          </p>
          <h2 className="mt-1 text-h3 text-primary">{entry.summary}</h2>
        </div>
        <button
          type="button"
          data-testid="curation-report-close"
          aria-label="关闭整理报告"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-caption text-secondary transition hover:text-primary"
        >
          关闭
        </button>
      </div>

      <dl className="mt-3 grid gap-2 text-caption text-secondary">
        <div className="flex gap-2">
          <dt className="shrink-0 text-tertiary">操作类型</dt>
          <dd data-testid="curation-report-kind">{curationKindLabelZh(entry.kind)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-tertiary">原因码</dt>
          <dd data-testid="curation-report-reason-code">{entry.reasonCode}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <dt className="shrink-0 text-tertiary">原因说明</dt>
          <dd data-testid="curation-report-reason-detail">{entry.reasonDetail}</dd>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <dt className="shrink-0 text-tertiary">受影响节点</dt>
          <dd data-testid="curation-report-affected-nodes">
            {entry.affectedNodeIds.join(", ")}
          </dd>
        </div>
        {migrationSummary ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <dt className="shrink-0 text-tertiary">边迁移</dt>
            <dd data-testid="curation-report-edge-migrations">{migrationSummary}</dd>
          </div>
        ) : null}
      </dl>

      {persistWarning ? (
        <p
          data-testid="curation-report-persist-warning"
          className="mt-2 text-caption text-status-warn"
        >
          变更未持久化，重启后无法撤销
        </p>
      ) : null}

      {lastUndoError ? (
        <p
          data-testid="curation-report-undo-error"
          role="alert"
          className="mt-2 text-caption text-status-error"
        >
          {lastUndoError}
        </p>
      ) : null}

      <p className="mt-2 text-caption text-tertiary">
        撤销整理不会删除你已确认入库的概念节点。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canUndo ? (
          <button
            type="button"
            data-testid="curation-report-undo"
            disabled={busy}
            onClick={() => void onUndo()}
            className="rounded-full border border-hud bg-bg-base/80 px-3 py-1.5 text-caption text-primary transition hover:border-accent-cyan/50 disabled:opacity-50"
          >
            撤销这次整理
          </button>
        ) : (
          <span
            data-testid="curation-report-undone-badge"
            className="rounded-full border border-hud/60 px-3 py-1 text-caption text-tertiary"
          >
            已撤销
          </span>
        )}
      </div>
    </div>
  );
}
