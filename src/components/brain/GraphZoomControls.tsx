import {
  depthPercentToLayer,
  layerToDepthPercent,
} from "@/lib/graphLayerDepth";

interface GraphZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  layerDepth: number;
  onLayerDepthChange: (value: number) => void;
  zoomPercentLabel?: string;
}

const DEPTH_TICKS = [6, 5, 4, 3, 2, 1] as const;
const DEPTH_LAYER_MIN = 1;
const DEPTH_LAYER_MAX = 6;

export function GraphZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  layerDepth,
  onLayerDepthChange,
  zoomPercentLabel = "100%",
}: GraphZoomControlsProps) {
  const currentLayer = depthPercentToLayer(layerDepth);

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
        <span
          className={[
            "font-hud text-caption",
            currentLayer === DEPTH_LAYER_MAX
              ? "text-accent-cyan"
              : "text-secondary",
          ].join(" ")}
        >
          6层
        </span>
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
                  "rounded-full border border-accent-cyan/40",
                  tick === currentLayer
                    ? "h-3 w-3 bg-accent-cyan/80 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                    : "h-2 w-2 bg-accent-cyan/45",
                ].join(" ")}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={layerDepth}
            onChange={(event) => {
              const raw = Number(event.target.value);
              onLayerDepthChange(layerToDepthPercent(depthPercentToLayer(raw)));
            }}
            className="graph-layer-range graph-layer-range-companion"
            aria-valuetext={`${currentLayer}层`}
          />
        </div>
        <span
          className={[
            "font-hud text-caption",
            currentLayer === DEPTH_LAYER_MIN
              ? "text-accent-cyan"
              : "text-secondary",
          ].join(" ")}
        >
          1层
        </span>
      </div>
    </>
  );
}
