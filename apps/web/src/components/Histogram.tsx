import { useMemo, useState, useCallback } from "react";

interface Props {
  values: number[];
  label: string;
  format: (v: number) => string;
  binCount?: number;
  color?: string;
}

const W = 760;
const H = 380;
const PAD = { top: 20, right: 24, bottom: 56, left: 72 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICK_COUNT_X = 6;
const TICK_COUNT_Y = 5;

function ticks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Gaussian KDE with Silverman's rule-of-thumb bandwidth */
function kde(sorted: number[], points: number[], bandwidth: number): number[] {
  const n = sorted.length;
  const factor = 1 / (n * bandwidth * Math.sqrt(2 * Math.PI));
  return points.map((x) => {
    let sum = 0;
    for (const xi of sorted) {
      const z = (x - xi) / bandwidth;
      sum += Math.exp(-0.5 * z * z);
    }
    return sum * factor;
  });
}

interface Bin {
  lo: number;
  hi: number;
  count: number;
}

export default function Histogram({ values, label, format, binCount = 30, color }: Props) {
  const [hoverBin, setHoverBin] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const sorted = useMemo(() => [...values].sort((a, b) => a - b), [values]);

  const stats = useMemo(() => {
    if (sorted.length === 0) return null;
    const n = sorted.length;
    const mean = sorted.reduce((s, v) => s + v, 0) / n;
    const median = percentile(sorted, 50);
    const p25 = percentile(sorted, 25);
    const p75 = percentile(sorted, 75);
    const stdDev = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    return { n, mean, median, p25, p75, stdDev };
  }, [sorted]);

  const { bins, maxCount, vMin, vMax } = useMemo(() => {
    if (sorted.length === 0) return { bins: [] as Bin[], maxCount: 0, vMin: 0, vMax: 1 };
    const vMin = sorted[0];
    const vMax = sorted[sorted.length - 1];
    const range = vMax - vMin || 1;
    const binW = range / binCount;
    const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
      lo: vMin + i * binW,
      hi: vMin + (i + 1) * binW,
      count: 0,
    }));
    for (const v of sorted) {
      const idx = Math.min(Math.floor((v - vMin) / binW), binCount - 1);
      bins[idx].count++;
    }
    const maxCount = Math.max(...bins.map((b) => b.count));
    return { bins, maxCount, vMin, vMax };
  }, [sorted, binCount]);

  // KDE curve
  const densityCurve = useMemo(() => {
    if (sorted.length < 10 || !stats) return null;
    const iqr = stats.p75 - stats.p25;
    const bw = 0.9 * Math.min(stats.stdDev, iqr / 1.34) * Math.pow(sorted.length, -0.2);
    if (!bw || !isFinite(bw) || bw <= 0) return null;
    const steps = 100;
    const range = vMax - vMin || 1;
    const xs = Array.from({ length: steps }, (_, i) => vMin + (i / (steps - 1)) * range);
    const ys = kde(sorted, xs, bw);
    const maxY = Math.max(...ys);
    if (maxY === 0) return null;
    // Scale density so peak aligns with ~85% of chart height
    const scale = (PLOT_H * 0.85) / maxY;
    return xs.map((x, i) => ({
      x: PAD.left + ((x - vMin) / range) * PLOT_W,
      y: PAD.top + PLOT_H - ys[i] * scale,
    }));
  }, [sorted, stats, vMin, vMax]);

  const densityPath = useMemo(() => {
    if (!densityCurve || densityCurve.length === 0) return "";
    return "M " + densityCurve.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  }, [densityCurve]);

  const sx = useCallback((v: number) => {
    const range = vMax - vMin || 1;
    return PAD.left + ((v - vMin) / range) * PLOT_W;
  }, [vMin, vMax]);

  const xTicks = useMemo(() => ticks(vMin, vMax, TICK_COUNT_X), [vMin, vMax]);
  const yTicks = useMemo(() => ticks(0, maxCount, TICK_COUNT_Y), [maxCount]);

  const barColor = color || "var(--accent)";

  const handleBarKeyDown = useCallback((e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" && idx < bins.length - 1) {
      e.preventDefault();
      const next = e.currentTarget.nextElementSibling as HTMLElement | null;
      next?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
      prev?.focus();
    }
  }, [bins.length]);

  if (values.length === 0) {
    return <p className="empty-state">No data available for this metric.</p>;
  }

  const ariaLabel = `Histogram of ${label} across ${values.length.toLocaleString()} values. ${
    stats ? `Median: ${format(stats.median)}, Mean: ${format(stats.mean)}.` : ""
  } Use "View as table" for accessible data.`;

  return (
    <div role="figure" aria-label={ariaLabel}>
      {stats && (
        <div className="histogram-stats">
          <span><strong>n</strong> = {stats.n.toLocaleString()}</span>
          <span><strong>Median</strong> = {format(stats.median)}</span>
          <span><strong>Mean</strong> = {format(stats.mean)}</span>
          <span><strong>P25</strong> = {format(stats.p25)}</span>
          <span><strong>P75</strong> = {format(stats.p75)}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="scatter-svg"
        role="group"
        aria-label={`${label} distribution`}
      >
        {/* Grid lines */}
        {yTicks.map((t) => (
          <line
            key={`gy-${t}`}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + PLOT_H - (t / maxCount) * PLOT_H}
            y2={PAD.top + PLOT_H - (t / maxCount) * PLOT_H}
            className="chart-grid-line"
          />
        ))}

        {/* Axes */}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} className="chart-axis-line" />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PLOT_H} className="chart-axis-line" />

        {/* Bars */}
        {bins.map((bin, i) => {
          const barW = PLOT_W / binCount;
          const barH = maxCount > 0 ? (bin.count / maxCount) * PLOT_H : 0;
          const x = PAD.left + i * barW;
          const y = PAD.top + PLOT_H - barH;
          const isHovered = hoverBin === i;
          return (
            <rect
              key={i}
              x={x + 0.5}
              y={y}
              width={Math.max(barW - 1, 1)}
              height={barH}
              fill={barColor}
              opacity={isHovered ? 1 : 0.65}
              rx={1}
              tabIndex={0}
              role="img"
              aria-label={`${format(bin.lo)} to ${format(bin.hi)}: ${bin.count} institution${bin.count !== 1 ? "s" : ""}`}
              onMouseEnter={() => setHoverBin(i)}
              onMouseLeave={() => setHoverBin(null)}
              onFocus={() => setHoverBin(i)}
              onBlur={() => setHoverBin(null)}
              onKeyDown={(e) => handleBarKeyDown(e, i)}
              style={{ outline: "none", cursor: "default" }}
            />
          );
        })}

        {/* KDE density curve */}
        {densityPath && (
          <path
            d={densityPath}
            fill="none"
            stroke="var(--accent-2, #c4b5fd)"
            strokeWidth="2"
            opacity="0.8"
          />
        )}

        {/* Median line */}
        {stats && (
          <>
            <line
              x1={sx(stats.median)}
              x2={sx(stats.median)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--accent-2, #c4b5fd)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.9"
            />
            <text
              x={sx(stats.median) + 4}
              y={PAD.top + 12}
              fill="var(--accent-2, #c4b5fd)"
              fontSize="10"
              fontWeight="600"
            >
              Median
            </text>
          </>
        )}

        {/* X tick labels */}
        {xTicks.map((t) => (
          <text key={`xt-${t}`} x={sx(t)} y={PAD.top + PLOT_H + 18} className="chart-tick" textAnchor="middle">
            {format(t)}
          </text>
        ))}

        {/* Y tick labels */}
        {yTicks.map((t) => (
          <text
            key={`yt-${t}`}
            x={PAD.left - 8}
            y={PAD.top + PLOT_H - (t / maxCount) * PLOT_H + 3.5}
            className="chart-tick"
            textAnchor="end"
          >
            {Math.round(t).toLocaleString()}
          </text>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + PLOT_W / 2} y={H - 6} className="chart-label" textAnchor="middle">
          {label}
        </text>
        <text
          x={14}
          y={PAD.top + PLOT_H / 2}
          className="chart-label"
          textAnchor="middle"
          transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
        >
          Institutions
        </text>

        {/* Hover tooltip */}
        {hoverBin != null && bins[hoverBin] && bins[hoverBin].count > 0 && (() => {
          const bin = bins[hoverBin];
          const barW = PLOT_W / binCount;
          const tx = PAD.left + hoverBin * barW + barW / 2;
          const barH = (bin.count / maxCount) * PLOT_H;
          const ty = PAD.top + PLOT_H - barH - 8;
          const flipX = tx > W - 160;
          const bx = flipX ? tx - 154 : tx - 4;
          return (
            <g role="status" aria-live="polite">
              <rect x={bx} y={ty - 28} width={150} height={26} rx={5} fill="var(--chart-tooltip-bg)" stroke="var(--border-strong)" />
              <text x={bx + 6} y={ty - 15} fill="var(--text)" fontSize="10" fontWeight="600">
                {format(bin.lo)} – {format(bin.hi)}
              </text>
              <text x={bx + 6} y={ty - 5} fill="var(--text-secondary)" fontSize="9.5">
                {bin.count.toLocaleString()} institution{bin.count !== 1 ? "s" : ""}
              </text>
            </g>
          );
        })()}
      </svg>

      <button
        className="button small chart-table-toggle"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        style={{ display: "block", margin: "12px auto 0" }}
      >
        {showTable ? "Hide table" : "View as table"}
      </button>

      {showTable && (
        <div className="chart-fallback-table">
          <table className="data-table">
            <caption>{label} distribution — {binCount} bins</caption>
            <thead>
              <tr>
                <th>Range</th>
                <th className="num">Count</th>
                <th className="num">% of total</th>
              </tr>
            </thead>
            <tbody>
              {bins.filter((b) => b.count > 0).map((bin, i) => (
                <tr key={i}>
                  <td>{format(bin.lo)} – {format(bin.hi)}</td>
                  <td className="num">{bin.count.toLocaleString()}</td>
                  <td className="num">{((bin.count / values.length) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
