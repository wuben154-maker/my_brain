import { useCallback, useMemo, useState } from "react";
import type { CognitiveAction } from "@/domain/actions/cognitiveAction";
import {
  parseBlogMetadataFromAction,
  parseResearchMetadataFromAction,
} from "@/domain/actions/writingResearchMetadata";
import { useGraphStore } from "@/stores/graphStore";
import { useWritingResearchStore } from "@/stores/writingResearchStore";

function kindLabel(kind: CognitiveAction["kind"]): string {
  if (kind === "blog_draft") {
    return "博客草稿";
  }
  if (kind === "research_followup") {
    return "研究追踪";
  }
  return kind;
}

/** KOS-E3 — preview blog/research markdown drafts; copy only (no publish). */
export function WritingResearchOverlay() {
  const open = useWritingResearchStore((state) => state.open);
  const actions = useWritingResearchStore((state) => state.actions);
  const closeWritingResearch = useWritingResearchStore((state) => state.closeWritingResearch);
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
    try {
      await navigator.clipboard.writeText(action.bodyMarkdown);
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
      data-testid="writing-research-overlay"
      role="region"
      aria-label="写作与研究"
      className="pointer-events-auto absolute inset-x-4 bottom-20 z-30 mx-auto max-w-2xl rounded-lg border border-sky-500/35 bg-bg-elevated/90 p-4 text-body shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-wide text-sky-300/80">
            写作与研究
          </p>
          <h2 className="mt-1 text-h3 text-primary">Blog / Research 草稿</h2>
          <p className="mt-1 text-caption text-secondary">
            本地 Markdown 预览；复制到剪贴板不会确认或发布。
          </p>
        </div>
        <button
          type="button"
          data-testid="writing-research-close"
          aria-label="关闭写作与研究"
          onClick={() => closeWritingResearch()}
          className="rounded-md px-2 py-1 text-caption text-secondary transition hover:text-primary"
        >
          关闭
        </button>
      </div>

      <ul
        data-testid="writing-research-list"
        className="mt-3 max-h-[42vh] space-y-3 overflow-y-auto"
      >
        {actions.map((action) => {
          const blogMeta = parseBlogMetadataFromAction(action);
          const researchMeta = parseResearchMetadataFromAction(action);
          return (
            <li
              key={action.id}
              data-testid={`writing-research-item-${action.id}`}
              className="rounded-md border border-white/10 bg-black/20 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  data-testid={`writing-research-draft-badge-${action.id}`}
                  className="rounded-full border border-sky-500/40 bg-sky-950/50 px-2 py-0.5 text-xs text-sky-100"
                >
                  草稿
                </span>
                <span className="text-caption text-sky-200/80">{kindLabel(action.kind)}</span>
              </div>
              <h3 className="mt-2 text-sm font-medium text-primary">{action.title}</h3>

              {blogMeta ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {blogMeta.pathNodeIds.map((nodeId) => (
                    <span
                      key={nodeId}
                      data-testid={`writing-research-path-chip-${action.id}-${nodeId}`}
                      className="rounded-full border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-xs text-sky-100"
                    >
                      {nodeTitleById.get(nodeId) ?? nodeId}
                    </span>
                  ))}
                </div>
              ) : null}

              {researchMeta ? (
                <ul
                  data-testid={`writing-research-items-${action.id}`}
                  className="mt-2 space-y-1 text-caption text-secondary"
                >
                  {researchMeta.researchItems.map((item) => (
                    <li key={item.worldItemId ?? item.query}>{item.label}</li>
                  ))}
                </ul>
              ) : null}

              <pre
                data-testid={`writing-research-preview-${action.id}`}
                className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/5 bg-black/30 p-2 text-xs text-primary/90"
              >
                {action.bodyMarkdown.slice(0, 1200)}
                {action.bodyMarkdown.length > 1200 ? "\n…" : ""}
              </pre>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid={`writing-research-copy-${action.id}`}
                  onClick={() => void handleCopy(action)}
                  className="rounded-md border border-sky-500/40 px-2 py-1 text-caption text-secondary transition hover:text-primary"
                >
                  {copiedId === action.id ? "已复制" : "复制 markdown"}
                </button>
                <button
                  type="button"
                  data-testid={`writing-research-publish-${action.id}`}
                  disabled
                  title="发布需用户确认与外部集成后才可启用"
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-md border border-white/10 px-2 py-1 text-caption text-secondary/50"
                >
                  发布到博客（未启用）
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
