import { useCallback, useEffect, useMemo, useState } from "react";
import { curationKindLabelZh } from "@/lib/curationKindLabel";
import { summarizeGraphDiff } from "@/lib/summarizeGraphDiff";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

function formatHistoryTime(at: string): string {
  try {
    return new Date(at).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return at;
  }
}

/** Time-ordered graph mutation history with compact diff (KOS-A3). */
export function GraphHistoryPanel() {
  const storage = useAppStore((state) => state.storage);
  const entries = useGraphHistoryStore((state) => state.entries);
  const loaded = useGraphHistoryStore((state) => state.loaded);
  const open = useGraphHistoryStore((state) => state.historyPanelOpen);
  const load = useGraphHistoryStore((state) => state.load);
  const setHistoryPanelOpen = useGraphHistoryStore(
    (state) => state.setHistoryPanelOpen,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!storage || loaded) {
      return;
    }
    void load(storage);
  }, [storage, loaded, load]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.at.localeCompare(a.at)),
    [entries],
  );

  const togglePanel = useCallback(() => {
    setHistoryPanelOpen(!open);
  }, [open, setHistoryPanelOpen]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="graph-history-panel-root"
      className="pointer-events-auto absolute left-5 top-14 z-20 flex flex-col items-start gap-2"
    >
      <button
        type="button"
        data-testid="graph-history-panel-toggle"
        aria-expanded={open}
        aria-label="图谱变更历史"
        onClick={togglePanel}
        className="rounded-full border border-hud bg-bg-elevated/80 px-3 py-1.5 text-caption text-secondary backdrop-blur-md transition hover:border-accent-cyan/50 hover:text-primary"
      >
        变更历史 ({entries.length})
      </button>

      {open ? (
        <div
          data-testid="graph-history-panel"
          className="max-h-[min(24rem,50vh)] w-72 overflow-y-auto rounded-lg border border-hud bg-bg-elevated/95 p-2 text-caption shadow-lg backdrop-blur-md"
        >
          <ul className="space-y-2">
            {sorted.map((entry) => {
              const diff = summarizeGraphDiff(entry.before, entry.after);
              const isExpanded = expandedId === entry.id;
              return (
                <li
                  key={entry.id}
                  data-testid={`graph-history-item-${entry.id}`}
                  className="rounded-md border border-hud/60 bg-bg-base/50 p-2"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.id)
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-primary">{entry.summary}</span>
                      {entry.undone ? (
                        <span
                          data-testid={`graph-history-undone-${entry.id}`}
                          className="shrink-0 text-tertiary"
                        >
                          已撤销
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex gap-2 text-tertiary">
                      <span data-testid={`graph-history-kind-${entry.id}`}>
                        {curationKindLabelZh(entry.kind)}
                      </span>
                      <span>·</span>
                      <span data-testid={`graph-history-at-${entry.id}`}>
                        {formatHistoryTime(entry.at)}
                      </span>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div
                      data-testid={`graph-history-diff-${entry.id}`}
                      className="mt-2 space-y-1 border-t border-hud/40 pt-2 text-tertiary"
                    >
                      {diff.addedNodeIds.length > 0 ? (
                        <p>新增节点：{diff.addedNodeIds.join(", ")}</p>
                      ) : null}
                      {diff.removedNodeIds.length > 0 ? (
                        <p>移除节点：{diff.removedNodeIds.join(", ")}</p>
                      ) : null}
                      {diff.addedEdgeIds.length > 0 ? (
                        <p>新增边：{diff.addedEdgeIds.join(", ")}</p>
                      ) : null}
                      {diff.removedEdgeIds.length > 0 ? (
                        <p>移除边：{diff.removedEdgeIds.join(", ")}</p>
                      ) : null}
                      {diff.addedNodeIds.length === 0 &&
                      diff.removedNodeIds.length === 0 &&
                      diff.addedEdgeIds.length === 0 &&
                      diff.removedEdgeIds.length === 0 ? (
                        <p>无结构差异</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
