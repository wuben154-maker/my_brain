interface GraphZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  layerDepth: number;
  onLayerDepthChange: (value: number) => void;
  /** Companion shell: depth scale 6→1 + bottom-center zoom pill. */
  companionChrome?: boolean;
  zoomPercentLabel?: string;
}

const DEPTH_TICKS = [6, 5, 4, 3, 2, 1] as const;

function PanHandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M9 11V6a2 2 0 1 1 4 0v5M13 11V5a2 2 0 1 1 4 0v7M17 12v-1a2 2 0 1 1 4 0v6a6 6 0 0 1-6 6h-1a5 5 0 0 1-5-5v-4a2 2 0 1 1 4 0v1" />
    </svg>
  );
}

function FitScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function GraphZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  layerDepth,
  onLayerDepthChange,
  companionChrome = false,
  zoomPercentLabel = "100%",
}: GraphZoomControlsProps) {
  if (companionChrome) {
    return (
      <>
        <div
          className="graph-hud-controls pointer-events-auto absolute bottom-4 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1 rounded-full border border-hud bg-bg-panel/90 px-2 py-1.5 font-hud text-caption text-secondary shadow-glow-soft backdrop-blur-md"
          aria-label="图谱缩放控件"
        >
          <button type="button" className="graph-hud-btn h-7 w-7 border-0 bg-transparent shadow-none" aria-label="平移">
            <PanHandIcon />
          </button>
          <span className="mx-0.5 h-4 w-px bg-hud" aria-hidden />
          <button type="button" className="graph-hud-btn h-7 w-7 border-0 bg-transparent shadow-none" onClick={onZoomOut} aria-label="缩小">
            −
          </button>
          <span className="min-w-[2.75rem] text-center text-secondary">{zoomPercentLabel}</span>
          <button type="button" className="graph-hud-btn h-7 w-7 border-0 bg-transparent shadow-none" onClick={onZoomIn} aria-label="放大">
            +
          </button>
          <span className="mx-0.5 h-4 w-px bg-hud" aria-hidden />
          <button type="button" className="graph-hud-btn h-7 w-7 border-0 bg-transparent shadow-none" onClick={onReset} aria-label="适应画布">
            <FitScreenIcon />
          </button>
        </div>

        <div
          className="graph-layer-slider pointer-events-auto absolute right-5 top-1/2 z-[2] flex -translate-y-1/2 flex-col items-center gap-2 py-1"
          aria-label="图谱深度"
        >
          <span className="font-hud text-caption uppercase tracking-hud text-muted">
            图谱深度
          </span>
          <span className="font-hud text-caption text-accent-cyan">6层</span>
          <div className="relative flex h-[9.75rem] flex-col items-center justify-center">
            <div
              className="pointer-events-none absolute inset-y-2 left-1/2 flex -translate-x-1/2 flex-col justify-between"
              aria-hidden
            >
              {DEPTH_TICKS.map((tick) => (
                <span
                  key={tick}
                  className="h-2.5 w-2.5 rounded-full border border-accent-cyan/35 bg-accent-cyan/50 shadow-[0_0_8px_rgba(34,211,238,0.45)]"
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

  return (
    <>
      <div
        className="graph-hud-controls pointer-events-auto absolute bottom-20 right-4 z-[2] flex flex-col gap-2"
        aria-label="图谱缩放控件"
      >
        <button type="button" className="graph-hud-btn" onClick={onZoomIn}>
          +
        </button>
        <button type="button" className="graph-hud-btn" onClick={onZoomOut}>
          −
        </button>
        <button type="button" className="graph-hud-btn text-caption" onClick={onReset}>
          重置
        </button>
      </div>

      <div
        className="graph-layer-slider absolute right-4 top-1/2 z-[2] flex -translate-y-1/2 flex-col items-center gap-2"
        aria-label="图谱层级"
      >
        <span className="font-hud text-caption uppercase tracking-hud text-muted">
          层级
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={layerDepth}
          onChange={(event) => onLayerDepthChange(Number(event.target.value))}
          className="graph-layer-range"
          aria-valuetext={`${layerDepth}%`}
        />
        <span className="font-hud text-caption text-secondary">{layerDepth}%</span>
      </div>
    </>
  );
}
