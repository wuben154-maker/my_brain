interface GraphZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  layerDepth: number;
  onLayerDepthChange: (value: number) => void;
}

export function GraphZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  layerDepth,
  onLayerDepthChange,
}: GraphZoomControlsProps) {
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
