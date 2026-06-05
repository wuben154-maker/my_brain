import type { CSSProperties } from "react";

/** Wireframe brain globe — pure SVG/CSS, no external assets. */
export function BootBrainSphere() {
  return (
    <div className="boot-brain-sphere" aria-hidden>
      <div className="boot-brain-beam boot-brain-beam-up" />
      <div className="boot-brain-beam boot-brain-beam-down" />

      <div className="boot-brain-orb-wrap">
        <svg
          className="boot-brain-svg"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="bootSphereGlow" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.42)" />
              <stop offset="70%" stopColor="rgba(34,211,238,0.1)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="bootSphereBloom">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="100" cy="100" r="88" fill="url(#bootSphereGlow)" />

          <g className="boot-brain-wireframe">
            {[18, 36, 54, 72].map((ry) => (
              <ellipse
                key={`lat-${ry}`}
                cx="100"
                cy="100"
                rx={88}
                ry={ry}
                className="boot-brain-lat"
              />
            ))}
            {[0, 30, 60, 90, 120, 150].map((angle) => (
              <ellipse
                key={`lon-${angle}`}
                cx="100"
                cy="100"
                rx={18}
                ry={88}
                className="boot-brain-lon"
                transform={`rotate(${angle} 100 100)`}
              />
            ))}
            {[
              [100, 28],
              [72, 52],
              [128, 52],
              [58, 100],
              [142, 100],
              [72, 148],
              [128, 148],
              [100, 172],
            ].map(([cx, cy], i) => (
              <circle
                key={`node-${i}`}
                cx={cx}
                cy={cy}
                r="2.5"
                className="boot-brain-node"
              />
            ))}
          </g>

          <polygon
            points="100,82 112,89 112,111 100,118 88,111 88,89"
            className="boot-brain-hex"
            filter="url(#bootSphereBloom)"
          />
          <text
            x="100"
            y="106"
            textAnchor="middle"
            className="boot-brain-glyph"
          >
            N
          </text>
        </svg>

        <div className="boot-brain-particles">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="boot-brain-particle" style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
      </div>

      {/* Holographic projector base rings */}
      <div className="boot-brain-base">
        <div className="boot-brain-ring boot-brain-ring-1" />
        <div className="boot-brain-ring boot-brain-ring-2" />
        <div className="boot-brain-ring boot-brain-ring-3" />
      </div>

      {/* Peripheral ambient labels */}
      <div className="boot-brain-decal boot-brain-decal-tl">
        <span className="boot-brain-decal-label">CORE ID</span>
        <span className="boot-brain-decal-value">NX-2B-A7</span>
        <div className="boot-brain-spark" />
      </div>
      <div className="boot-brain-decal boot-brain-decal-bl">
        <span className="boot-brain-decal-label">NEURAL NET</span>
        <span className="boot-brain-decal-value">7.8T NODES</span>
        <span className="boot-brain-decal-status">ACTIVE</span>
      </div>
      <div className="boot-brain-decal boot-brain-decal-br">
        <span className="boot-brain-decal-label">DATA STREAM</span>
        <span className="boot-brain-decal-value">2.4 GB/s</span>
        <div className="boot-brain-bars">
          {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
            <span key={i} className="boot-brain-bar" style={{ height: `${h * 100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
