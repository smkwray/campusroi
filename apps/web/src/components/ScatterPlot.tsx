import { useMemo, useState, useRef, useCallback } from "react";
import { ols } from "../regression";

export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  color: string;
  id: number;
}

interface Props {
  data: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  onClickPoint?: (id: number) => void;
  /** Draw a y=x reference line */
  showDiagonal?: boolean;
}

const W = 760;
const H = 420;
const PAD = { top: 20, right: 24, bottom: 52, left: 72 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICK_COUNT = 5;

function niceRange(min: number, max: number): [number, number] {
  const pad = (max - min) * 0.05 || 1;
  return [min - pad, max + pad];
}

function ticks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export default function ScatterPlot({ data, xLabel, yLabel, xFormat, yFormat, onClickPoint, showDiagonal }: Props) {
  const [hover, setHover] = useState<ScatterPoint | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    const [xMin, xMax] = niceRange(Math.min(...xs), Math.max(...xs));
    const [yMin, yMax] = niceRange(Math.min(...ys), Math.max(...ys));
    return { xMin, xMax, yMin, yMax };
  }, [data]);

  const reg = useMemo(() => ols(data), [data]);

  const sx = useCallback((v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * PLOT_W, [xMin, xMax]);
  const sy = useCallback((v: number) => PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H, [yMin, yMax]);

  const xTicks = useMemo(() => ticks(xMin, xMax, TICK_COUNT), [xMin, xMax]);
  const yTicks = useMemo(() => ticks(yMin, yMax, TICK_COUNT), [yMin, yMax]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || data.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      let closest: ScatterPoint | null = null;
      let minDist = 400;
      for (const pt of data) {
        const dx = sx(pt.x) - mx;
        const dy = sy(pt.y) - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist) {
          minDist = d2;
          closest = pt;
        }
      }
      setHover(closest);
    },
    [data, sx, sy]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="scatter-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid lines */}
        {yTicks.map((t) => (
          <line key={`gy-${t}`} x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} className="chart-grid-line" />
        ))}
        {xTicks.map((t) => (
          <line key={`gx-${t}`} y1={PAD.top} y2={H - PAD.bottom} x1={sx(t)} x2={sx(t)} className="chart-grid-line" />
        ))}

        {/* Axes */}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} className="chart-axis-line" />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} className="chart-axis-line" />

        {/* Reference diagonal y=x */}
        {showDiagonal && (
          <line
            x1={sx(Math.max(xMin, yMin))} y1={sy(Math.max(xMin, yMin))}
            x2={sx(Math.min(xMax, yMax))} y2={sy(Math.min(xMax, yMax))}
            stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3"
          />
        )}

        {/* Regression line */}
        {reg && (
          <line
            x1={sx(xMin)} y1={sy(reg.slope * xMin + reg.intercept)}
            x2={sx(xMax)} y2={sy(reg.slope * xMax + reg.intercept)}
            stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 4" opacity="0.7"
            clipPath="url(#plotClip)"
          />
        )}

        {/* Clip path for regression line */}
        <defs>
          <clipPath id="plotClip">
            <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
          </clipPath>
        </defs>

        {/* X tick labels */}
        {xTicks.map((t) => (
          <text key={`xt-${t}`} x={sx(t)} y={H - PAD.bottom + 18} className="chart-tick" textAnchor="middle">
            {xFormat(t)}
          </text>
        ))}

        {/* Y tick labels */}
        {yTicks.map((t) => (
          <text key={`yt-${t}`} x={PAD.left - 8} y={sy(t) + 3.5} className="chart-tick" textAnchor="end">
            {yFormat(t)}
          </text>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + PLOT_W / 2} y={H - 6} className="chart-label" textAnchor="middle">
          {xLabel}
        </text>
        <text
          x={14}
          y={PAD.top + PLOT_H / 2}
          className="chart-label"
          textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
        >
          {yLabel}
        </text>

        {/* Data points */}
        {data.map((pt) => (
          <circle
            key={pt.id}
            cx={sx(pt.x)}
            cy={sy(pt.y)}
            r={hover?.id === pt.id ? 6 : 3.5}
            fill={pt.color}
            opacity={hover ? (hover.id === pt.id ? 1 : 0.2) : "var(--chart-point-dim)"}
            style={{ cursor: onClickPoint ? "pointer" : undefined, transition: "opacity 0.15s" }}
            onClick={onClickPoint ? () => onClickPoint(pt.id) : undefined}
          />
        ))}

        {/* Tooltip */}
        {hover && (() => {
          const tx = sx(hover.x);
          const ty = sy(hover.y);
          const flipX = tx > W - 200;
          const flipY = ty < 60;
          const bx = flipX ? tx - 8 : tx + 8;
          const by = flipY ? ty + 16 : ty - 36;
          return (
            <g>
              <rect
                x={flipX ? bx - 194 : bx}
                y={by}
                width={194}
                height={32}
                rx={6}
                fill="var(--chart-tooltip-bg)"
                stroke="var(--border-strong)"
              />
              <text x={flipX ? bx - 187 : bx + 7} y={by + 13} fill="var(--text)" fontSize="10.5" fontWeight="600">
                {hover.label.length > 30 ? hover.label.slice(0, 28) + "\u2026" : hover.label}
              </text>
              <text x={flipX ? bx - 187 : bx + 7} y={by + 25} fill="var(--text-secondary)" fontSize="9.5">
                {xLabel}: {xFormat(hover.x)}  |  {yLabel}: {yFormat(hover.y)}
              </text>
            </g>
          );
        })()}
      </svg>
      {reg && (
        <div className="regression-badge">
          <strong>R² = {reg.r2.toFixed(3)}</strong>
          <span>OLS trend across {reg.n} fields</span>
        </div>
      )}
    </div>
  );
}
