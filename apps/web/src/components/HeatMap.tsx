import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { ols } from "../regression";

export interface HeatMapData {
  x: number;
  y: number;
  ownership: number;
  label: string;
  id: number;
}

interface Props {
  data: HeatMapData[];
  xLabel: string;
  yLabel: string;
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
}

const BINS_X = 40;
const BINS_Y = 28;
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
const W = 760;
const H = 420;
const PAD = { top: 16, right: 24, bottom: 52, left: 68 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICK_COUNT = 5;
const TABLE_ROWS = 20;

function ticks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

function getThemeColors(): { text: string; grid: string; axis: string; accent: string; bg: string } {
  const s = getComputedStyle(document.documentElement);
  return {
    text: s.getPropertyValue("--chart-text").trim() || "#9fb0d6",
    grid: s.getPropertyValue("--chart-grid").trim() || "rgba(148,163,184,0.08)",
    axis: s.getPropertyValue("--chart-axis").trim() || "rgba(148,163,184,0.2)",
    accent: s.getPropertyValue("--accent").trim() || "#7dd3fc",
    bg: s.getPropertyValue("--bg").trim() || "#0b1020",
  };
}

function hexToRGB(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function bgToRGB(bg: string): [number, number, number] {
  if (bg.startsWith("#")) return hexToRGB(bg);
  const m = bg.match(/(\d+)/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [11, 16, 32];
}

interface BinInfo {
  count: number;
  labels: string[];
  xLow: number;
  xHigh: number;
  yLow: number;
  yHigh: number;
}

export default function HeatMap({ data, xLabel, yLabel, xFormat, yFormat }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; count: number; top: string[] } | null>(null);
  const [themeKey, setThemeKey] = useState(0);
  const [showTable, setShowTable] = useState(false);

  // Watch for theme changes and trigger canvas redraw
  useEffect(() => {
    const obs = new MutationObserver(() => setThemeKey((k) => k + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const { xMin, xMax, yMin, yMax, bins, maxCount, binW, binH } = useMemo(() => {
    if (data.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1, bins: [] as BinInfo[], maxCount: 0, binW: 1, binH: 1 };
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    const pad = 0.05;
    const xRange = Math.max(...xs) - Math.min(...xs) || 1;
    const yRange = Math.max(...ys) - Math.min(...ys) || 1;
    const xMin = Math.min(...xs) - xRange * pad;
    const xMax = Math.max(...xs) + xRange * pad;
    const yMin = Math.min(...ys) - yRange * pad;
    const yMax = Math.max(...ys) + yRange * pad;

    const binW = (xMax - xMin) / BINS_X;
    const binH = (yMax - yMin) / BINS_Y;

    const bins: BinInfo[] = Array.from(
      { length: BINS_X * BINS_Y },
      (_, idx) => {
        const bx = idx % BINS_X;
        const by = Math.floor(idx / BINS_X);
        return {
          count: 0,
          labels: [],
          xLow: xMin + bx * binW,
          xHigh: xMin + (bx + 1) * binW,
          yLow: yMin + by * binH,
          yHigh: yMin + (by + 1) * binH,
        };
      }
    );

    for (const d of data) {
      const bx = Math.min(Math.floor((d.x - xMin) / binW), BINS_X - 1);
      const by = Math.min(Math.floor((d.y - yMin) / binH), BINS_Y - 1);
      const idx = by * BINS_X + bx;
      bins[idx].count++;
      if (bins[idx].labels.length < 3) bins[idx].labels.push(d.label);
    }

    const maxCount = Math.max(...bins.map((b) => b.count));
    return { xMin, xMax, yMin, yMax, bins, maxCount, binW, binH };
  }, [data]);

  const reg = useMemo(() => ols(data), [data]);

  // Top bins for fallback table
  const topBins = useMemo(
    () => [...bins].filter((b) => b.count > 0).sort((a, b) => b.count - a.count).slice(0, TABLE_ROWS),
    [bins],
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = getThemeColors();
    const [ar, ag, ab] = hexToRGB(colors.accent);
    const [br, bg_, bb] = bgToRGB(colors.bg);

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    const cellW = PLOT_W / BINS_X;
    const cellH = PLOT_H / BINS_Y;
    const sx = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * PLOT_W;
    const sy = (v: number) => PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;

    // Grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    const xT = ticks(xMin, xMax, TICK_COUNT);
    const yT = ticks(yMin, yMax, TICK_COUNT);
    for (const t of xT) { ctx.beginPath(); ctx.moveTo(sx(t), PAD.top); ctx.lineTo(sx(t), PAD.top + PLOT_H); ctx.stroke(); }
    for (const t of yT) { ctx.beginPath(); ctx.moveTo(PAD.left, sy(t)); ctx.lineTo(PAD.left + PLOT_W, sy(t)); ctx.stroke(); }

    // Bins — interpolate from bg to accent based on density
    for (let byIdx = 0; byIdx < BINS_Y; byIdx++) {
      for (let bx = 0; bx < BINS_X; bx++) {
        const bin = bins[byIdx * BINS_X + bx];
        if (bin.count === 0) continue;
        const t = Math.pow(bin.count / maxCount, 0.45);
        const r = Math.round(br + t * (ar - br));
        const g = Math.round(bg_ + t * (ag - bg_));
        const b = Math.round(bb + t * (ab - bb));
        const alpha = 0.25 + t * 0.75;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        const x = PAD.left + bx * cellW;
        const y = PAD.top + (BINS_Y - 1 - byIdx) * cellH;
        ctx.beginPath();
        ctx.roundRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1, 2);
        ctx.fill();
      }
    }

    // Regression line
    if (reg) {
      const x1 = xMin;
      const x2 = xMax;
      const y1 = reg.slope * x1 + reg.intercept;
      const y2 = reg.slope * x2 + reg.intercept;
      ctx.save();
      ctx.beginPath();
      ctx.rect(PAD.left, PAD.top, PLOT_W, PLOT_H);
      ctx.clip();
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(x1), sy(y1));
      ctx.lineTo(sx(x2), sy(y2));
      ctx.stroke();
      ctx.restore();
    }

    // Axes
    ctx.strokeStyle = colors.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top + PLOT_H);
    ctx.lineTo(PAD.left + PLOT_W, PAD.top + PLOT_H);
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, PAD.top + PLOT_H);
    ctx.stroke();

    // Tick labels
    ctx.fillStyle = colors.text;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (const t of xT) ctx.fillText(xFormat(t), sx(t), PAD.top + PLOT_H + 16);
    ctx.textAlign = "right";
    for (const t of yT) ctx.fillText(yFormat(t), PAD.left - 6, sy(t) + 3.5);

    // Axis labels
    ctx.font = "500 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, PAD.left + PLOT_W / 2, H - 6);
    ctx.save();
    ctx.translate(14, PAD.top + PLOT_H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }, [data, bins, maxCount, xMin, xMax, yMin, yMax, xLabel, yLabel, xFormat, yFormat, reg, themeKey]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || data.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      const my = ((e.clientY - rect.top) / rect.height) * H;

      if (mx < PAD.left || mx > PAD.left + PLOT_W || my < PAD.top || my > PAD.top + PLOT_H) {
        setTooltip(null);
        return;
      }

      const cellW = PLOT_W / BINS_X;
      const cellH = PLOT_H / BINS_Y;
      const bx = Math.floor((mx - PAD.left) / cellW);
      const by = BINS_Y - 1 - Math.floor((my - PAD.top) / cellH);
      const idx = by * BINS_X + bx;
      const bin = bins[idx];

      if (!bin || bin.count === 0) { setTooltip(null); return; }

      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        count: bin.count,
        top: bin.labels,
      });
    },
    [data, bins]
  );

  const ariaLabel = `Heatmap: ${xLabel} vs ${yLabel} across ${data.length.toLocaleString()} institutions.${
    reg ? ` R-squared = ${reg.r2.toFixed(3)}.` : ""
  } Use the "View as table" button for an accessible data summary.`;

  return (
    <div className="heatmap-wrap" role="figure" aria-label={ariaLabel}>
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H, maxWidth: "100%" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        role="img"
        aria-hidden={showTable}
        aria-label={`${xLabel} vs ${yLabel} density chart`}
      />
      {tooltip && (
        <div
          className="heatmap-tooltip"
          role="status"
          style={{
            left: Math.min(tooltip.x + 12, W - 200),
            top: tooltip.y - 10,
          }}
        >
          <strong>{tooltip.count} institution{tooltip.count !== 1 ? "s" : ""}</strong>
          {tooltip.top.map((name, i) => (
            <span key={i} className="heatmap-tooltip-name">{name}</span>
          ))}
          {tooltip.count > tooltip.top.length && (
            <span className="heatmap-tooltip-more">+{tooltip.count - tooltip.top.length} more</span>
          )}
        </div>
      )}
      <div className="heatmap-scale">
        <span>Fewer</span>
        <div className="heatmap-gradient" />
        <span>More institutions</span>
      </div>
      {reg && (
        <div className="regression-badge">
          <strong>R² = {reg.r2.toFixed(3)}</strong>
          <span>OLS trend across {reg.n.toLocaleString()} institutions</span>
        </div>
      )}
      <button
        className="button small chart-table-toggle"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
      >
        {showTable ? "Hide table" : "View as table"}
      </button>
      {showTable && (
        <div className="chart-fallback-table">
          <table className="data-table">
            <caption>
              Top {topBins.length} densest regions — {xLabel} vs {yLabel}
            </caption>
            <thead>
              <tr>
                <th>{xLabel} range</th>
                <th>{yLabel} range</th>
                <th className="num">Count</th>
                <th>Example institutions</th>
              </tr>
            </thead>
            <tbody>
              {topBins.map((bin, i) => (
                <tr key={i}>
                  <td>{xFormat(bin.xLow)} – {xFormat(bin.xHigh)}</td>
                  <td>{yFormat(bin.yLow)} – {yFormat(bin.yHigh)}</td>
                  <td className="num">{bin.count}</td>
                  <td>{bin.labels.join(", ")}{bin.count > bin.labels.length ? ` +${bin.count - bin.labels.length} more` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
