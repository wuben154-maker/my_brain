import { useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  countSourcedConcepts,
  indexSourcesByDomain,
} from "@/lib/sourcesIndex";
import { useGraphStore } from "@/stores/graphStore";
import { useUiStore } from "@/stores/uiStore";

function openSourceUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

function focusConceptOnGraph(nodeId: string): void {
  useUiStore.getState().setSection("graph");
  useGraphStore.getState().selectNode(nodeId);
}

/** Docs nav partition — browse concepts grouped by source domain (N2). */
export function DocsLibrary() {
  const nodes = useGraphStore((state) => state.nodes);
  const groups = useMemo(() => indexSourcesByDomain(nodes), [nodes]);
  const total = countSourcedConcepts(nodes);

  if (total === 0) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col"
        data-testid="section-docs"
      >
        <GlassCard
          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center"
          data-testid="docs-library-empty"
        >
          <p className="text-h2 text-primary">还没有带来源的概念</p>
          <p className="text-caption text-muted">
            去「探索」入库几条，来源链接会出现在这里。
          </p>
        </GlassCard>
      </section>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      data-testid="section-docs"
    >
      <header>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
          文档库
        </p>
        <h2 className="text-h2 text-primary">来源索引</h2>
        <p className="mt-1 text-caption text-muted">
          共 {total} 个概念节点带来源链接，按域名归类（不缓存原文）。
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <GlassCard
            key={group.domain}
            className="flex flex-col gap-3 p-4"
            data-testid={`docs-domain-${group.domain}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-body font-medium text-primary">
                {group.domain}
              </h3>
              <span
                className="font-hud text-caption text-muted"
                data-testid={`docs-domain-count-${group.domain}`}
              >
                {group.items.length} 条
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {group.items.map((node) => (
                <li
                  key={node.id}
                  className="rounded-sm border border-hud/60 p-3"
                  data-testid={`docs-entry-${node.id}`}
                >
                  <p className="text-body font-medium text-primary">
                    {node.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-caption text-secondary">
                    {node.intro}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-sm border border-hud px-3 py-1.5 text-caption text-primary"
                      data-testid={`docs-open-source-${node.id}`}
                      onClick={() => openSourceUrl(node.sourceUrl ?? "")}
                    >
                      打开来源
                    </button>
                    <button
                      type="button"
                      className="rounded-sm bg-accent-cyan px-3 py-1.5 text-caption font-medium text-bg-base"
                      data-testid={`docs-focus-graph-${node.id}`}
                      onClick={() => focusConceptOnGraph(node.id)}
                    >
                      在星图中查看
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
