import { useState } from "react";

/** Corner settings trigger + placeholder overlay (V5 wires real panels). */
export function SettingsOverlay() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="settings-corner"
        aria-label="设置"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-hud bg-bg-elevated/80 text-secondary backdrop-blur-md transition hover:border-accent-cyan/50 hover:text-primary"
      >
        ⚙
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="设置"
          data-testid="settings-overlay"
          className="absolute right-0 top-12 z-30 w-64 rounded-md border border-hud bg-bg-elevated/95 p-4 shadow-glow-cyan backdrop-blur-md"
        >
          <p className="font-hud text-label uppercase tracking-hud text-muted">
            设置
          </p>
          <p className="mt-2 text-body text-secondary">
            V5 将接入音色、人格与 API 配置。
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 text-caption text-accent-cyan hover:underline"
          >
            关闭
          </button>
        </div>
      ) : null}
    </>
  );
}
