import type { ReactNode } from "react";

export type CompanionShellSlot = "radar" | "curation" | "review" | "action";

export interface CompanionShellProps {
  activeSlot?: CompanionShellSlot;
  radar?: ReactNode;
  curation?: ReactNode;
  review?: ReactNode;
  action?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
}

const SLOT_LABELS: Record<CompanionShellSlot, string> = {
  radar: "今日 Radar",
  curation: "整理报告",
  review: "每周脑图回顾",
  action: "行动草稿",
};

function SlotPlaceholder({ slot }: { slot: CompanionShellSlot }) {
  return (
    <div className="rounded-md border border-hud/50 bg-bg-base/30 p-3 text-caption text-muted">
      {SLOT_LABELS[slot]} slot 已预留
    </div>
  );
}

function slotContent(slot: CompanionShellSlot, props: CompanionShellProps) {
  if (slot === "radar") {
    return props.radar ?? <SlotPlaceholder slot="radar" />;
  }
  if (slot === "curation") {
    return props.curation ?? <SlotPlaceholder slot="curation" />;
  }
  if (slot === "review") {
    return props.review ?? <SlotPlaceholder slot="review" />;
  }
  return props.action ?? <SlotPlaceholder slot="action" />;
}

/**
 * Shared carrier for Radar, curation reports, Weekly Review, and Action drafts.
 * Idle mode keeps testable slots mounted without adding visible controls to the v2 scene.
 */
export function CompanionShell(props: CompanionShellProps) {
  const activeSlot = props.activeSlot ?? null;
  const slots: CompanionShellSlot[] = ["radar", "curation", "review", "action"];

  return (
    <section
      data-testid="companion-shell"
      data-active-slot={activeSlot ?? "idle"}
      aria-label="伴侣浮层承载区"
      className="pointer-events-none absolute right-[5%] top-[12%] z-20 w-[min(24rem,calc(100vw-2rem))]"
    >
      <div
        data-testid="companion-shell-surface"
        aria-hidden={activeSlot ? undefined : true}
        className={
          activeSlot
            ? "pointer-events-auto rounded-lg border border-hud bg-bg-panel/90 p-4 shadow-glow-soft backdrop-blur-md"
            : "sr-only"
        }
      >
        {activeSlot ? (
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-hud text-label uppercase tracking-hud text-muted">
                伴侣浮层
              </p>
              <h2 className="mt-1 text-h2 text-primary">{SLOT_LABELS[activeSlot]}</h2>
            </div>
            <div className="flex gap-2">
              {props.onBack ? (
                <button
                  type="button"
                  data-testid="companion-shell-back"
                  onClick={props.onBack}
                  className="rounded-sm border border-hud px-2 py-1 text-caption text-secondary transition hover:border-accent-cyan/50 hover:text-primary"
                >
                  返回
                </button>
              ) : null}
              {props.onClose ? (
                <button
                  type="button"
                  data-testid="companion-shell-close"
                  onClick={props.onClose}
                  className="rounded-sm border border-hud px-2 py-1 text-caption text-secondary transition hover:border-accent-cyan/50 hover:text-primary"
                >
                  关闭
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {slots.map((slot) => (
            <div
              key={slot}
              data-testid={`companion-shell-${slot}-slot`}
              data-slot-state={activeSlot === slot ? "active" : "idle"}
              hidden={Boolean(activeSlot && activeSlot !== slot)}
            >
              {slotContent(slot, props)}
            </div>
          ))}
        </div>
      </div>
      {/* KP-03 mainflow entry carrier — inert until post-ingest/auto-curate wiring lands. */}
      <div
        data-testid="companion-shell-review-entry-carrier"
        aria-hidden="true"
        className="sr-only"
        data-entry-semantics="kp-03-post-ingest-or-auto-curate"
      />
    </section>
  );
}
