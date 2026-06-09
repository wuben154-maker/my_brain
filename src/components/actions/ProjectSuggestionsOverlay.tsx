import { useCallback, useMemo, useState } from "react";
import type { CognitiveAction } from "@/domain/actions/cognitiveAction";
import { parseMetadataFromAction } from "@/domain/actions/projectSuggestionMetadata";
import { useGraphStore } from "@/stores/graphStore";
import { useProjectSuggestionsStore } from "@/stores/projectSuggestionsStore";

function kindLabel(kind: CognitiveAction["kind"]): string {
  if (kind === "project_issue") {
    return "Issue 草稿";
  }
  if (kind === "roadmap") {
    return "Roadmap 草稿";
  }
  return kind;
}

/** KOS-E2 — list project suggestion drafts; copy markdown only (no GitHub submit). */
export function ProjectSuggestionsOverlay() {
  const open = useProjectSuggestionsStore((state) => state.open);
  const actions = useProjectSuggestionsStore((state) => state.actions);
  const closeSuggestions = useProjectSuggestionsStore((state) => state.closeSuggestions);
  const nodes = useGraphStore((state) => state.nodes);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const nodeTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      map.set(node.id, node.title);
    }
    return map;
  }, [nodes]);

  const handleCopy = useCallback(async (action: CognitiveAction) => {
    const markdown = action.bodyMarkdown;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedId(action.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  }, []);

  if (!open || actions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="project-suggestions-overlay"
      role="region"
      aria-label="项目建议"
      className="pointer-events-auto absolute inset-x-4 bottom-20 z-30 mx-auto max-w-2xl rounded-lg border border-amber-500/35 bg-bg-elevated/90 p-4 text-body shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-wide text-amber-300/80">
            项目建议
          </p>
          <h2 className="mt-1 text-h3 text-primary">Issue / Roadmap 草稿</h2>
          <p className="mt-1 text-caption text-secondary">
            以下为本地草稿，尚未创建 GitHub issue；确认与外部发布需后续集成。
          </p>
        </div>
        <button
          type="button"
          data-testid="project-suggestions-close"
          aria-label="关闭项目建议"
          onClick={() => closeSuggestions()}
          className="rounded-md px-2 py-1 text-caption text-secondary transition hover:text-primary"
        >
          关闭
        </button>
      </div>

      <ul
        data-testid="project-suggestions-list"
        className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto"
      >
        {actions.map((action) => {
          const metadata = parseMetadataFromAction(action);
          const linkedIds = metadata?.linkedNodeIds ?? [];
          return (
            <li
              key={action.id}
              data-testid={`project-suggestion-item-${action.id}`}
              className="rounded-md border border-white/10 bg-black/20 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid={`project-suggestion-draft-badge-${action.id}`}
                  className="rounded-full border border-amber-500/40 bg-amber-950/50 px-2 py-0.5 text-xs text-amber-100"
                >
                  草稿
                </span>
                <span className="text-caption text-amber-200/80">{kindLabel(action.kind)}</span>
              </div>
              <h3 className="mt-2 text-sm font-medium text-primary">{action.title}</h3>

              {linkedIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {linkedIds.map((nodeId) => (
                    <span
                      key={nodeId}
                      data-testid={`project-suggestion-node-chip-${action.id}-${nodeId}`}
                      className="rounded-full border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-100"
                    >
                      {nodeTitleById.get(nodeId) ?? nodeId}
                    </span>
                  ))}
                </div>
              ) : null}

              {metadata ? (
                <dl className="mt-2 space-y-1 text-caption text-secondary">
                  <div data-testid={`project-suggestion-reason-${action.id}`}>
                    <dt className="text-amber-200/70">原因</dt>
                    <dd className="whitespace-pre-wrap text-primary/90">{metadata.reason}</dd>
                  </div>
                  <div data-testid={`project-suggestion-impact-${action.id}`}>
                    <dt className="text-amber-200/70">预期影响</dt>
                    <dd className="whitespace-pre-wrap">{metadata.expectedImpact}</dd>
                  </div>
                  <div data-testid={`project-suggestion-next-${action.id}`}>
                    <dt className="text-amber-200/70">建议下一步</dt>
                    <dd className="whitespace-pre-wrap">{metadata.suggestedNextStep}</dd>
                  </div>
                </dl>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid={`project-suggestion-copy-${action.id}`}
                  onClick={() => void handleCopy(action)}
                  className="rounded-md border border-amber-500/40 px-2 py-1 text-caption text-secondary transition hover:text-primary"
                >
                  {copiedId === action.id ? "已复制" : "复制 markdown"}
                </button>
                <button
                  type="button"
                  data-testid={`project-suggestion-github-submit-${action.id}`}
                  disabled
                  title="需用户确认与 GitHub 集成后才可提交"
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-md border border-white/10 px-2 py-1 text-caption text-secondary/50"
                >
                  提交到 GitHub（未启用）
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
