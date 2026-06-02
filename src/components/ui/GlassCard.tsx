import type { ElementType, ReactNode } from "react";

export interface GlassCardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  id?: string;
  "data-testid"?: string;
  /** Active HUD border + stronger cyan glow (DESIGN §3–4). */
  active?: boolean;
  /** Tighter padding for graph HUD overlays (DESIGN §3 spacing ladder). */
  dense?: boolean;
}

/**
 * Shared glassmorphism panel — tokens only, no magic values.
 * @see DESIGN.md §4 Glassmorphism
 */
export function GlassCard({
  children,
  className = "",
  as: Component = "section",
  id,
  "data-testid": dataTestId,
  active = false,
  dense = false,
}: GlassCardProps) {
  return (
    <Component
      id={id}
      data-testid={dataTestId}
      className={[
        "glass-card text-primary",
        dense ? "p-3" : "p-4",
        active ? "glass-card-active" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}
