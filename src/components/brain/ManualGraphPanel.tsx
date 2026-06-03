import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SuggestConfirmDialog } from "@/components/brain/SuggestConfirmDialog";
import {
  useManualGraphOps,
  type ManualNodeForm,
} from "@/hooks/useManualGraphOps";
import { useGraphStore } from "@/stores/graphStore";

const EMPTY_FORM: ManualNodeForm = {
  title: "",
  intro: "",
  sourceUrl: "",
};

const fieldClass =
  "mt-1 w-full rounded-sm border border-hud bg-bg-panel/80 px-2 py-1.5 text-body text-primary backdrop-blur-sm";

export function ManualGraphPanel() {
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectNode = useGraphStore((state) => state.selectNode);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<ManualNodeForm>(EMPTY_FORM);
  const [migrateTargetId, setMigrateTargetId] = useState("");
  const [expanded, setExpanded] = useState(false);

  const {
    pendingProposal,
    isApplying,
    errorMessage,
    proposeCreate,
    proposeUpdate,
    proposeArchive,
    confirmProposals,
    rejectProposals,
  } = useManualGraphOps();

  const migrationCandidates = useMemo(
    () => nodes.filter((node) => node.id !== selectedNodeId),
    [nodes, selectedNodeId],
  );

  const isConfirming = pendingProposal !== null;
  const confirmProposalsList = pendingProposal ? [pendingProposal] : [];

  useEffect(() => {
    if (selectedNode) {
      setMode("edit");
      setForm({
        title: selectedNode.title,
        intro: selectedNode.intro,
        sourceUrl: selectedNode.sourceUrl ?? "",
      });
      setMigrateTargetId("");
      return;
    }
    setMode("create");
    setForm(EMPTY_FORM);
    setMigrateTargetId("");
  }, [selectedNode]);

  useEffect(() => {
    if (selectedNode || isConfirming) {
      setExpanded(true);
    }
  }, [selectedNode, isConfirming]);

  const updateField = (field: keyof ManualNodeForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = () => {
    if (mode === "edit" && selectedNode) {
      proposeUpdate(selectedNode.id, form);
      return;
    }
    proposeCreate(form);
  };

  const handleArchive = () => {
    if (!selectedNode) {
      return;
    }
    proposeArchive(
      selectedNode.id,
      selectedNode.title,
      migrateTargetId || null,
    );
  };

  const handleCollapse = () => {
    setExpanded(false);
    if (!isConfirming) {
      selectNode(null);
    }
  };

  if (!expanded) {
    return (
      <>
        <div className="pointer-events-none absolute left-4 top-12 z-[3]">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={[
              "graph-hud-btn pointer-events-auto h-8 min-w-[4.5rem] px-2 text-caption",
              selectedNode || isConfirming ? "border-hud-active text-accent-cyan" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-expanded={false}
            aria-controls="manual-graph-panel"
          >
            手动
            {selectedNode ? " · 编辑" : ""}
          </button>
        </div>

        <SuggestConfirmDialog
          open={isConfirming}
          proposals={confirmProposalsList}
          isBusy={isApplying}
          confirmLabel="确认变更"
          onConfirm={() => void confirmProposals()}
          onCancel={rejectProposals}
        />
      </>
    );
  }

  return (
    <>
      <GlassCard
        id="manual-graph-panel"
        dense
        active={isConfirming || Boolean(selectedNode)}
        className="pointer-events-auto absolute left-4 top-12 z-[3] flex max-h-[min(70vh,26rem)] w-[min(100%-2rem,17.5rem)] flex-col overflow-hidden"
      >
        <header className="shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-hud text-label uppercase tracking-hud text-muted">
                手动掌控
              </p>
              <h2 className="mt-0.5 truncate text-h2 font-medium text-primary">
                {mode === "edit" ? "编辑概念" : "新建概念"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCollapse}
              className="graph-hud-btn shrink-0 text-caption"
              aria-label="收起手动面板"
            >
              ✕
            </button>
          </div>
          {selectedNode ? (
            <button
              type="button"
              onClick={() => selectNode(null)}
              className="mt-1 text-caption text-accent-cyan hover:underline"
            >
              取消选中
            </button>
          ) : (
            <p className="mt-1 text-caption leading-snug text-muted">
              点击星图节点可编辑；变更需确认后写入
            </p>
          )}
        </header>

        <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          <label className="block">
            <span className="text-caption text-muted">概念标题</span>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className={fieldClass}
              placeholder="例如 Transformer"
            />
          </label>

          <label className="block">
            <span className="text-caption text-muted">短介绍</span>
            <textarea
              value={form.intro}
              onChange={(event) => updateField("intro", event.target.value)}
              rows={2}
              className={`${fieldClass} resize-none`}
              placeholder="概念层面的简要说明…"
            />
          </label>

          <label className="block">
            <span className="text-caption text-muted">来源链接</span>
            <input
              value={form.sourceUrl}
              onChange={(event) => updateField("sourceUrl", event.target.value)}
              className={fieldClass}
              placeholder="https://…"
            />
          </label>

          {selectedNode?.sourceUrl ? (
            <a
              href={selectedNode.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-caption text-accent-cyan hover:underline"
            >
              查看当前来源链接
            </a>
          ) : null}

          {errorMessage ? (
            <p className="text-caption text-status-error">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={isApplying || isConfirming}
              onClick={handleSubmit}
              className="rounded-sm bg-accent-cyan px-3 py-1.5 text-body font-medium text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "edit" ? "保存修改" : "新建概念"}
            </button>
            {mode === "edit" && selectedNode ? (
              <button
                type="button"
                disabled={isApplying || isConfirming}
                onClick={handleArchive}
                className="rounded-sm border border-status-error/50 px-3 py-1.5 text-body text-status-error disabled:cursor-not-allowed disabled:opacity-40"
              >
                归档删除
              </button>
            ) : null}
          </div>

          {mode === "edit" && migrationCandidates.length > 0 ? (
            <label className="block">
              <span className="text-caption text-muted">
                归档时关系边迁移至（可选）
              </span>
              <select
                value={migrateTargetId}
                onChange={(event) => setMigrateTargetId(event.target.value)}
                className={fieldClass}
              >
                <option value="">不迁移（边随节点一起隐藏）</option>
                {migrationCandidates.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </GlassCard>

      <SuggestConfirmDialog
        open={isConfirming}
        proposals={confirmProposalsList}
        isBusy={isApplying}
        confirmLabel="确认变更"
        onConfirm={() => void confirmProposals()}
        onCancel={rejectProposals}
      />
    </>
  );
}
