interface GraphZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  layerDepth: number;
  onLayerDepthChange: (value: number) => void;
  zoomPercentLabel?: string;
}

const DEPTH_TICKS = [6, 5, 4, 3, 2, 1] as const;

export function GraphZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  layerDepth,
  onLayerDepthChange,
  zoomPercentLabel = "100%",
}: GraphZoomControlsProps) {
  return (
    <>
      <div
        className="graph-hud-controls companion-zoom-hud pointer-events-auto absolute bottom-4 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1 rounded-full border border-hud/80 bg-bg-panel/92 px-2.5 py-1.5 font-hud text-caption text-secondary shadow-glow-soft backdrop-blur-md"
        aria-label="图谱缩放控件"
      >
        <button
          type="button"
          className="graph-hud-btn h-7 w-7 border-0 bg-transparent shadow-none"
          onClick={onZoomOut}
          aria-label="缩小"
        >
          −
        </button>
        <span className="min-w-[2.75rem] text-center text-secondary">
          {zoomPercentLabel}
        </span>
        <button
          type="button"
          className="graph-hud-btn h-7 w-7 border-0 bg-transparent shadow-none"
          onClick={onZoomIn}
          aria-label="放大"
        >
          +
        </button>
        <span className="mx-0.5 h-4 w-px bg-hud" aria-hidden />
        <button
          type="button"
          className="graph-hud-btn h-7 min-w-[2.5rem] border-0 bg-transparent px-1.5 text-caption shadow-none"
          onClick={onReset}
          aria-label="重置"
        >
          重置
        </button>
      </div>

      <div
        className="graph-layer-slider companion-depth-scale pointer-events-auto absolute right-4 top-1/2 z-[2] flex -translate-y-1/2 flex-col items-center gap-1.5 py-1"
        aria-label="图谱深度"
      >
        <span className="font-hud text-caption uppercase tracking-hud text-muted">
          图谱深度
        </span>
        <span className="font-hud text-caption text-accent-cyan">6层</span>
        <div className="relative flex h-[10.5rem] flex-col items-center justify-center">
          <div
            className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-accent-cyan/25"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-2 left-1/2 flex -translate-x-1/2 flex-col justify-between"
            aria-hidden
          >
            {DEPTH_TICKS.map((tick) => (
              <span
                key={tick}
                className={[
                  "rounded-full border border-accent-cyan/40 bg-accent-cyan/45 shadow-[0_0_8px_rgba(34,211,238,0.4)]",
                  tick === 4 ? "h-3 w-3 bg-accent-cyan/80" : "h-2 w-2",
                ].join(" ")}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={layerDepth}
            onChange={(event) => onLayerDepthChange(Number(event.target.value))}
            className="graph-layer-range graph-layer-range-companion"
            aria-valuetext={`${layerDepth}%`}
          />
        </div>
        <span className="font-hud text-caption text-secondary">1层</span>
      </div>
    </>
  );
}
