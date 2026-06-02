import { useEffect } from "react";
import type { ProposalEnvelope } from "@/agent/types";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  PROPOSAL_KIND_LABELS,
  PROPOSAL_SOURCE_LABELS,
} from "@/components/agent/proposalLabels";
import { useProposalInboxActions } from "@/hooks/useProposalInboxActions";
import { useProposalStore } from "@/stores/proposalStore";

interface ProposalInboxProps {
  open: boolean;
  /** Required for drawer overlay; optional for inline agent partition. */
  onClose?: () => void;
  /** When true, render as inline panel (agent partition) instead of overlay drawer. */
  inline?: boolean;
}

function sortPending(items: ProposalEnvelope[]): ProposalEnvelope[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function ProposalInboxCard({
  envelope,
  busyId,
  onPreview,
  onApprove,
  onReject,
}: {
  envelope: ProposalEnvelope;
  busyId: string | null;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const busy = busyId === envelope.id;
  const { proposal } = envelope;

  return (
    <li
      className="rounded-md border border-hud bg-bg-elevated/50 p-3"
      data-testid={`proposal-card-${envelope.id}`}
      onMouseEnter={onPreview}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-hud text-caption uppercase tracking-hud text-accent-blue">
          {PROPOSAL_KIND_LABELS[proposal.kind]}
        </span>
        <span className="font-hud text-caption text-muted">
          {PROPOSAL_SOURCE_LABELS[envelope.source]}
        </span>
      </div>
      <p className="mt-2 text-body text-primary">{proposal.summary}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="rounded-sm border border-hud px-3 py-1.5 text-caption text-primary disabled:opacity-40"
        >
          拒绝
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="rounded-sm bg-accent-cyan px-3 py-1.5 text-caption font-medium text-bg-base disabled:opacity-40"
        >
          {busy ? "写入中…" : "同意"}
        </button>
      </div>
    </li>
  );
}

function InboxList({ inline }: { inline: boolean }) {
  const pending = useProposalStore((state) => state.pending);
  const { busyId, errorMessage, previewProposal, clearPreview, approve, reject } =
    useProposalInboxActions();

  useEffect(() => {
    return () => clearPreview();
  }, [clearPreview]);

  const sorted = sortPending(pending);

  if (sorted.length === 0) {
    return (
      <GlassCard
        className="flex flex-col items-center justify-center gap-2 p-8 text-center"
        data-testid="proposal-inbox-empty"
      >
        <p className="text-h2 text-primary">收件箱为空</p>
        <p className="text-caption text-muted">
          后台 Agent 产出的图谱建议会出现在这里，请你逐条确认。
        </p>
      </GlassCard>
    );
  }

  return (
    <div className={inline ? "flex flex-col gap-3" : "flex flex-col gap-3 p-4"}>
      {errorMessage ? (
        <p className="text-caption text-status-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <ul className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto">
        {sorted.map((envelope) => (
          <ProposalInboxCard
            key={envelope.id}
            envelope={envelope}
            busyId={busyId}
            onPreview={() => void previewProposal(envelope)}
            onApprove={() => void approve(envelope.id)}
            onReject={() => void reject(envelope.id)}
          />
        ))}
      </ul>
    </div>
  );
}

/** Drawer or inline panel listing pending proposals (A4). */
export function ProposalInbox({
  open,
  onClose = () => undefined,
  inline = false,
}: ProposalInboxProps) {
  if (!open && !inline) {
    return null;
  }

  if (inline) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col gap-3"
        data-testid="proposal-inbox-inline"
      >
        <header>
          <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
            待办建议
          </p>
          <h2 className="text-h2 text-primary">智能体收件箱</h2>
          <p className="mt-1 text-caption text-muted">
            逐条同意或拒绝，确认后才会写入知识图谱。
          </p>
        </header>
        <InboxList inline />
      </section>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-bg-base/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="待办建议收件箱"
      data-testid="proposal-inbox-drawer"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-hud bg-bg-elevated/95 shadow-glow-cyan backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-hud px-4 py-3">
          <div>
            <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
              待办建议
            </p>
            <h2 className="text-h2 text-primary">收件箱</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-hud px-3 py-1.5 text-caption text-secondary hover:text-primary"
          >
            关闭
          </button>
        </div>
        <InboxList inline={false} />
      </div>
    </div>
  );
}
