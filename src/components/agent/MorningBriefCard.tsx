import { GlassCard } from "@/components/ui/GlassCard";
import type { AgentDigest } from "@/agent/types";

interface MorningBriefCardProps {
  digest: AgentDigest;
  onDismiss: () => void;
}

/** Ephemeral digest card — dismiss does not persist (A4 / invariant 1). */
export function MorningBriefCard({ digest, onDismiss }: MorningBriefCardProps) {
  return (
    <GlassCard
      active
      className="flex flex-col gap-3 p-4"
      data-testid="morning-brief-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
            晨间简报
          </p>
          <h3 className="mt-1 text-h2 text-primary">{digest.title}</h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-sm border border-hud px-2 py-1 text-caption text-secondary hover:text-primary"
          aria-label="关闭简报"
        >
          关闭
        </button>
      </div>
      <ul className="max-h-48 space-y-3 overflow-y-auto">
        {digest.sections.map((section) => (
          <li key={section.headline}>
            <p className="text-body font-medium text-primary">
              {section.headline}
            </p>
            <p className="mt-1 text-caption text-secondary">{section.body}</p>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
