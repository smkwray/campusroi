import { useMemo, useState, useRef, useCallback } from "react";
import type { Institution } from "../types";
import { OWNERSHIP_LABELS, formatCurrency, formatPercent, getCompletionRate } from "../data";

interface Props {
  institutions: Institution[];
  onClickInstitution?: (id: number) => void;
}

// ── Albers Equal-Area Conic (contiguous US defaults) ──
const DEG = Math.PI / 180;
const PHI1 = 29.5 * DEG;
const PHI2 = 45.5 * DEG;
const PHI0 = 38 * DEG;
const LAM0 = -98 * DEG;

const N = (Math.sin(PHI1) + Math.sin(PHI2)) / 2;
const C = Math.cos(PHI1) ** 2 + 2 * N * Math.sin(PHI1);
const RHO0 = Math.sqrt(C - 2 * N * Math.sin(PHI0)) / N;

function albersProject(lng: number, lat: number): [number, number] {
  const lam = lng * DEG;
  const phi = lat * DEG;
  const theta = N * (lam - LAM0);
  const rho = Math.sqrt(C - 2 * N * Math.sin(phi)) / N;
  const x = rho * Math.sin(theta);
  const y = RHO0 - rho * Math.cos(theta);
  return [x, y];
}

const OWNERSHIP_COLORS: Record<number, string> = {
  1: "#7dd3fc", // Public — blue
  2: "#a78bfa", // Private nonprofit — purple
  3: "#fbbf24", // Private for-profit — amber
};
const DEFAULT_COLOR = "#94a3b8";

const W = 800;
const H = 480;
const PAD = 20;
const POINT_R = 1.8;

// Non-contiguous state/territory codes
const AK = new Set(["AK"]);
const HI = new Set(["HI"]);
const TERRITORIES = new Set(["PR", "VI", "GU", "AS", "MP", "FM", "MH", "PW"]);

function isContiguous(state: string): boolean {
  return !AK.has(state) && !HI.has(state) && !TERRITORIES.has(state);
}

/** Remap a group of projected points into a target box (in SVG coords) */
function insetTransform(
  pts: { px: number; py: number }[],
  targetX: number, targetY: number, targetW: number, targetH: number,
): Map<number, [number, number]> {
  const map = new Map<number, [number, number]>();
  if (pts.length === 0) return map;
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of pts) {
    if (p.px < xMin) xMin = p.px;
    if (p.px > xMax) xMax = p.px;
    if (p.py < yMin) yMin = p.py;
    if (p.py > yMax) yMax = p.py;
  }
  const srcW = xMax - xMin || 1;
  const srcH = yMax - yMin || 1;
  const scale = Math.min(targetW / srcW, targetH / srcH);
  const offX = targetX + (targetW - srcW * scale) / 2;
  const offY = targetY + (targetH - srcH * scale) / 2;
  for (let i = 0; i < pts.length; i++) {
    map.set(i, [offX + (pts[i].px - xMin) * scale, offY + (pts[i].py - yMin) * scale]);
  }
  return map;
}

export default function InstitutionMap({ institutions, onClickInstitution }: Props) {
  const [hover, setHover] = useState<Institution | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Project all institutions, compute viewport from contiguous US only, inset AK/HI/territories
  const { points, vx, vy, vw, vh } = useMemo(() => {
    const contig: { inst: Institution; px: number; py: number }[] = [];
    const akPts: { inst: Institution; px: number; py: number; idx: number }[] = [];
    const hiPts: { inst: Institution; px: number; py: number; idx: number }[] = [];
    const terrPts: { inst: Institution; px: number; py: number; idx: number }[] = [];
    const allPts: { inst: Institution; px: number; py: number }[] = [];

    for (const inst of institutions) {
      if (inst.longitude == null || inst.latitude == null) continue;
      if (!isFinite(inst.longitude) || !isFinite(inst.latitude)) continue;
      const [px, py] = albersProject(inst.longitude, inst.latitude);
      const pt = { inst, px, py };
      const idx = allPts.length;
      allPts.push(pt);
      if (AK.has(inst.state)) akPts.push({ ...pt, idx });
      else if (HI.has(inst.state)) hiPts.push({ ...pt, idx });
      else if (TERRITORIES.has(inst.state)) terrPts.push({ ...pt, idx });
      else contig.push(pt);
    }

    if (allPts.length === 0) return { points: allPts, vx: 0, vy: 0, vw: 1, vh: 1 };

    // Viewport from contiguous US only
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of contig) {
      if (p.px < xMin) xMin = p.px;
      if (p.px > xMax) xMax = p.px;
      if (p.py < yMin) yMin = p.py;
      if (p.py > yMax) yMax = p.py;
    }
    const padX = (xMax - xMin) * 0.03;
    const padY = (yMax - yMin) * 0.03;
    const viewX = xMin - padX;
    const viewY = yMin - padY;
    const viewW = xMax - xMin + 2 * padX;
    const viewH = yMax - yMin + 2 * padY;

    // Inset positions (in SVG pixel coords)
    const akMap = insetTransform(akPts, PAD + 10, H - 130, 110, 100);
    const hiMap = insetTransform(hiPts, PAD + 140, H - 80, 80, 50);
    const terrMap = insetTransform(terrPts, W - PAD - 130, H - 80, 120, 50);

    // Apply inset coordinates to non-contiguous points by converting SVG px back to projected coords
    for (const [localIdx, [svgX, svgY]] of akMap) {
      const projX = viewX + ((svgX - PAD) / (W - 2 * PAD)) * viewW;
      const projY = viewY + ((svgY - PAD) / (H - 2 * PAD)) * viewH;
      allPts[akPts[localIdx].idx].px = projX;
      allPts[akPts[localIdx].idx].py = projY;
    }
    for (const [localIdx, [svgX, svgY]] of hiMap) {
      const projX = viewX + ((svgX - PAD) / (W - 2 * PAD)) * viewW;
      const projY = viewY + ((svgY - PAD) / (H - 2 * PAD)) * viewH;
      allPts[hiPts[localIdx].idx].px = projX;
      allPts[hiPts[localIdx].idx].py = projY;
    }
    for (const [localIdx, [svgX, svgY]] of terrMap) {
      const projX = viewX + ((svgX - PAD) / (W - 2 * PAD)) * viewW;
      const projY = viewY + ((svgY - PAD) / (H - 2 * PAD)) * viewH;
      allPts[terrPts[localIdx].idx].px = projX;
      allPts[terrPts[localIdx].idx].py = projY;
    }

    return {
      points: allPts,
      vx: viewX,
      vy: viewY,
      vw: viewW,
      vh: viewH,
    };
  }, [institutions]);

  // Scale functions
  const sx = useCallback((px: number) => PAD + ((px - vx) / vw) * (W - 2 * PAD), [vx, vw]);
  const sy = useCallback((py: number) => PAD + ((py - vy) / vh) * (H - 2 * PAD), [vy, vh]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let closest: Institution | null = null;
      let minDist = 200; // px² threshold
      for (const pt of points) {
        const dx = sx(pt.px) - mx;
        const dy = sy(pt.py) - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist) {
          minDist = d2;
          closest = pt.inst;
        }
      }
      setHover(closest);
    },
    [points, sx, sy],
  );

  // State-level summary for fallback table
  const stateSummary = useMemo(() => {
    const map = new Map<string, { state: string; count: number; pub: number; priv: number; fp: number }>();
    for (const inst of institutions) {
      if (!inst.state) continue;
      let entry = map.get(inst.state);
      if (!entry) {
        entry = { state: inst.state, count: 0, pub: 0, priv: 0, fp: 0 };
        map.set(inst.state, entry);
      }
      entry.count++;
      if (inst.ownership === 1) entry.pub++;
      else if (inst.ownership === 2) entry.priv++;
      else if (inst.ownership === 3) entry.fp++;
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [institutions]);

  const ariaLabel = `Map of ${points.length.toLocaleString()} U.S. institutions, colored by ownership type. Use "View as table" for an accessible state-by-state summary.`;

  return (
    <div role="figure" aria-label={ariaLabel}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="scatter-svg institution-map"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="U.S. institution map"
      >
        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill="transparent" />

        {/* Inset labels */}
        <text x={PAD + 65} y={H - 132} fill="var(--text-secondary)" fontSize="8" textAnchor="middle" opacity="0.6">AK</text>
        <text x={PAD + 180} y={H - 82} fill="var(--text-secondary)" fontSize="8" textAnchor="middle" opacity="0.6">HI</text>
        <text x={W - PAD - 70} y={H - 82} fill="var(--text-secondary)" fontSize="8" textAnchor="middle" opacity="0.6">PR / Territories</text>

        {/* Points */}
        {points.map((pt) => {
          const isHovered = hover?.institution_id === pt.inst.institution_id;
          return (
            <circle
              key={pt.inst.institution_id}
              cx={sx(pt.px)}
              cy={sy(pt.py)}
              r={isHovered ? 5 : POINT_R}
              fill={OWNERSHIP_COLORS[pt.inst.ownership ?? 0] ?? DEFAULT_COLOR}
              opacity={hover ? (isHovered ? 1 : 0.3) : 0.6}
              style={{
                cursor: onClickInstitution ? "pointer" : undefined,
                transition: "opacity 0.1s",
              }}
              onClick={onClickInstitution ? () => onClickInstitution(pt.inst.institution_id) : undefined}
            />
          );
        })}

        {/* Tooltip */}
        {hover && (() => {
          const pt = points.find((p) => p.inst.institution_id === hover.institution_id);
          if (!pt) return null;
          const tx = sx(pt.px);
          const ty = sy(pt.py);
          const flipX = tx > W - 240;
          const flipY = ty < 70;
          const bx = flipX ? tx - 230 : tx + 10;
          const by = flipY ? ty + 12 : ty - 58;
          const cr = getCompletionRate(hover);
          return (
            <g role="status" aria-live="polite">
              <rect x={bx} y={by} width={220} height={52} rx={6} fill="var(--chart-tooltip-bg)" stroke="var(--border-strong)" />
              <text x={bx + 8} y={by + 14} fill="var(--text)" fontSize="10.5" fontWeight="600">
                {hover.school_name.length > 34 ? hover.school_name.slice(0, 32) + "\u2026" : hover.school_name}
              </text>
              <text x={bx + 8} y={by + 27} fill="var(--text-secondary)" fontSize="9.5">
                {hover.city}, {hover.state} · {OWNERSHIP_LABELS[hover.ownership ?? 0] ?? "Unknown"}
              </text>
              <text x={bx + 8} y={by + 40} fill="var(--text-secondary)" fontSize="9.5">
                Earnings: {formatCurrency(hover.median_earnings)} · {cr.label}: {formatPercent(cr.value)}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="map-legend">
        {Object.entries(OWNERSHIP_LABELS).map(([key, label]) => (
          <span key={key} className="map-legend-item">
            <span className="map-legend-dot" style={{ background: OWNERSHIP_COLORS[+key] ?? DEFAULT_COLOR }} />
            {label}
          </span>
        ))}
        <span className="map-legend-count">{points.length.toLocaleString()} institutions mapped</span>
      </div>

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
            <caption>Institutions by state and ownership type</caption>
            <thead>
              <tr>
                <th>State</th>
                <th className="num">Total</th>
                <th className="num">Public</th>
                <th className="num">Private nonprofit</th>
                <th className="num">For-profit</th>
              </tr>
            </thead>
            <tbody>
              {stateSummary.map((s) => (
                <tr key={s.state}>
                  <td>{s.state}</td>
                  <td className="num">{s.count}</td>
                  <td className="num">{s.pub}</td>
                  <td className="num">{s.priv}</td>
                  <td className="num">{s.fp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
