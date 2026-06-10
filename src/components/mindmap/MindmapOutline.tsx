import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { conceptNodes } from "@/domain/graph";
import { buildGraphOutline, type OutlineTreeNode } from "@/lib/graphOutline";
import { useGraphStore } from "@/stores/graphStore";
import { useUiStore } from "@/stores/uiStore";

function focusConceptOnGraph(nodeId: string): void {
  useUiStore.getState().setSection("graph");
  useGraphStore.getState().selectNode(nodeId);
}

function OutlineBranch({
  entry,
  collapsed,
  onToggle,
}: {
  entry: OutlineTreeNode;
  collapsed: Set<string>;
  onToggle: (nodeId: string) => void;
}) {
  const hasChildren = entry.children.length > 0;
  const isCollapsed = collapsed.has(entry.node.id);

  return (
    <li className="flex flex-col" data-testid={`mindmap-node-${entry.node.id}`}>
      <div
        className="flex items-start gap-2 rounded-md py-1.5 pl-2"
        style={{ marginLeft: `${entry.depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="mt-0.5 font-hud text-caption text-accent-cyan hover:text-primary"
            aria-expanded={!isCollapsed}
            data-testid={`mindmap-toggle-${entry.node.id}`}
            onClick={() => onToggle(entry.node.id)}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
        ) : (
          <span className="w-3 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-primary">{entry.node.title}</p>
          {entry.node.intro ? (
            <p className="line-clamp-2 text-caption text-muted">{entry.node.intro}</p>
          ) : null}
          <button
            type="button"
            className="mt-1 text-caption text-accent-cyan hover:underline"
            data-testid={`mindmap-focus-graph-${entry.node.id}`}
            onClick={() => focusConceptOnGraph(entry.node.id)}
          >
            在星图中查看
          </button>
        </div>
      </div>
      {hasChildren && !isCollapsed ? (
        <ul className="flex flex-col">
          {entry.children.map((child) => (
            <OutlineBranch
              key={child.node.id}
              entry={child}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Mindmap nav partition — collapsible BFS outline of the live graph (N3). */
export function MindmapOutline() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const forest = useMemo(
    () => buildGraphOutline(conceptNodes(nodes), edges),
    [nodes, edges],
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (nodeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (forest.length === 0) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col"
        data-testid="section-mindmap"
      >
        <GlassCard
          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center"
          data-testid="mindmap-outline-empty"
        >
          <p className="text-h2 text-primary">图谱还是空的</p>
          <p className="text-caption text-muted">
            入库第一个概念后，这里会按连接关系展开分层大纲。
          </p>
        </GlassCard>
      </section>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      data-testid="section-mindmap"
    >
      <header>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
          思维导图
        </p>
        <h2 className="text-h2 text-primary">分层大纲</h2>
        <p className="mt-1 text-caption text-muted">
          从连接最密的枢纽向外展开；点击条目可回到星图定位（只读，不改图谱）。
        </p>
      </header>

      <GlassCard className="p-4" data-testid="mindmap-outline-tree">
        <ul className="flex flex-col gap-1">
          {forest.map((root) => (
            <OutlineBranch
              key={root.node.id}
              entry={root}
              collapsed={collapsed}
              onToggle={toggle}
            />
          ))}
        </ul>
      </GlassCard>
    </section>
  );
}
