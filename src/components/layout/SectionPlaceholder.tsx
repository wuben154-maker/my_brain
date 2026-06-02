import { GlassCard } from "@/components/ui/GlassCard";
import type { NavSectionDef } from "@/lib/navSections";

interface SectionPlaceholderProps {
  section: NavSectionDef;
}

/** Unified placeholder for planned nav partitions (N0). */
export function SectionPlaceholder({ section }: SectionPlaceholderProps) {
  return (
    <GlassCard
      active
      className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center"
      data-testid={`section-placeholder-${section.id}`}
    >
      <p className="font-hud text-caption tracking-hud text-accent-cyan">
        规划中
      </p>
      <h2 className="text-h2 text-primary">{section.label}</h2>
      {section.specRef ? (
        <p className="max-w-md text-body text-secondary">
          本分区将在后续里程碑落地，详见{" "}
          <code className="rounded bg-bg-panel px-1.5 py-0.5 text-caption text-accent-cyan">
            {section.specRef}
          </code>
        </p>
      ) : null}
    </GlassCard>
  );
}
