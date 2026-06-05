import type { CSSProperties } from "react";

const SPHERE_R = 88;
const CENTER = 100;

// Latitude rings (horizontal ellipses) — denser mesh than round 1.
const LAT_RYS = [16, 31, 46, 61, 76, 88];
// Longitude arcs (rotated thin ellipses) every 22.5° for a dense globe.
const LON_ANGLES = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];

/** Neural-net node dots sitting on the wireframe latitude rings. */
const NODES = LAT_RYS.flatMap((ry) =>
  [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const x = CENTER + SPHERE_R * Math.cos(a);
    const y = CENTER + ry * Math.sin(a);
    const dist = Math.hypot(x - CENTER, y - CENTER) / SPHERE_R;
    return { x, y, r: 1.3 + (1 - dist) * 1.6, o: 0.55 + (1 - dist) * 0.45 };
  }),
);

/** Wireframe brain globe — pure SVG/CSS, no external assets. */
export function BootBrainSphere() {
  return (
    <div className="boot-brain-sphere" aria-hidden>
      <div className="boot-brain-beam boot-brain-beam-up" />
      <div className="boot-brain-apex" />
      <div className="boot-brain-beam boot-brain-beam-down" />
      <div className="boot-brain-converge" />

      <div className="boot-brain-orb-wrap">
        <svg
          className="boot-brain-svg"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="bootSphereGlow" cx="50%" cy="48%" r="52%">
              <stop offset="0%" stopColor="rgba(120,235,255,0.55)" />
              <stop offset="38%" stopColor="rgba(34,211,238,0.28)" />
              <stop offset="72%" stopColor="rgba(34,150,238,0.12)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="bootSphereRim" cx="50%" cy="50%" r="50%">
              <stop offset="78%" stopColor="transparent" />
              <stop offset="94%" stopColor="rgba(34,211,238,0.16)" />
              <stop offset="100%" stopColor="rgba(120,235,255,0.4)" />
            </radialGradient>
            <filter id="bootSphereBloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Luminous core + rim halo */}
          <circle cx={CENTER} cy={CENTER} r="92" fill="url(#bootSphereGlow)" />
          <circle cx={CENTER} cy={CENTER} r="88" fill="url(#bootSphereRim)" />

          <g className="boot-brain-wireframe">
            {LAT_RYS.map((ry) => (
              <ellipse
                key={`lat-${ry}`}
                cx={CENTER}
                cy={CENTER}
                rx={SPHERE_R}
                ry={ry}
                className="boot-brain-lat"
              />
            ))}
            {LON_ANGLES.map((angle) => (
              <ellipse
                key={`lon-${angle}`}
                cx={CENTER}
                cy={CENTER}
                rx={SPHERE_R}
                ry={16}
                className="boot-brain-lon"
                transform={`rotate(${angle} ${CENTER} ${CENTER})`}
              />
            ))}
            {/* outer sphere outline */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={SPHERE_R}
              className="boot-brain-outline"
            />
            {NODES.map((n, i) => (
              <circle
                key={`node-${i}`}
                cx={n.x}
                cy={n.y}
                r={n.r}
                className="boot-brain-node"
                style={{ opacity: n.o }}
              />
            ))}
          </g>

          {/* Hex "N" core */}
          <polygon
            points="100,80 114,88 114,112 100,120 86,112 86,88"
            className="boot-brain-hex"
            filter="url(#bootSphereBloom)"
          />
          <polygon
            points="100,86 109,91 109,109 100,114 91,109 91,91"
            className="boot-brain-hex-inner"
          />
          <text x={CENTER} y="106" textAnchor="middle" className="boot-brain-glyph">
            N
          </text>
        </svg>

        <div className="boot-brain-particles">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className="boot-brain-particle"
              style={{ "--i": i } as CSSProperties}
            />
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
            <span
              key={i}
              className="boot-brain-bar"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
