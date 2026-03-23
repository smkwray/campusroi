import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadInstitutions, loadCIPAggregates, formatCurrency } from "../data";
import type { Institution } from "../types";
import type { CIPAggregate } from "../data";
import HeatMap from "../components/HeatMap";
import type { HeatMapData } from "../components/HeatMap";
import ScatterPlot from "../components/ScatterPlot";
import type { ScatterPoint } from "../components/ScatterPlot";

function toHeatMapData(
  institutions: Institution[],
  xKey: keyof Institution,
  yKey: keyof Institution,
): HeatMapData[] {
  const pts: HeatMapData[] = [];
  for (const inst of institutions) {
    const x = inst[xKey] as number | null;
    // For completion_rate, coalesce with completion_rate_l4
    const y = yKey === "completion_rate"
      ? (inst.completion_rate ?? inst.completion_rate_l4)
      : inst[yKey] as number | null;
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) continue;
    pts.push({ x, y, ownership: inst.ownership ?? 0, label: inst.school_name, id: inst.institution_id });
  }
  return pts;
}

function useAccentColors(): { primary: string; secondary: string } {
  const [colors, setColors] = useState({ primary: "#c4b5fd", secondary: "#7dd3fc" });
  useEffect(() => {
    const update = () => {
      const s = getComputedStyle(document.documentElement);
      setColors({
        primary: s.getPropertyValue("--accent-2").trim() || "#c4b5fd",
        secondary: s.getPropertyValue("--accent").trim() || "#7dd3fc",
      });
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

function fieldsToScatter(fields: CIPAggregate[], xKey: keyof CIPAggregate, yKey: keyof CIPAggregate, color: string): ScatterPoint[] {
  const pts: ScatterPoint[] = [];
  for (const f of fields) {
    const x = f[xKey] as number | null;
    const y = f[yKey] as number | null;
    if (x == null || y == null || !isFinite(x) || !isFinite(y)) continue;
    pts.push({ x, y, label: f.cip_title, color, id: f.cip_code });
  }
  return pts;
}

export default function Insights() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [fields, setFields] = useState<CIPAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const accent = useAccentColors();

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      loadInstitutions().then(setInstitutions),
      loadCIPAggregates().then(setFields),
    ])
      .catch((e) => setError(e?.message || "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const debtVsEarnings = useMemo(() => toHeatMapData(institutions, "median_debt", "median_earnings"), [institutions]);
  const priceVsCompletion = useMemo(() => toHeatMapData(institutions, "avg_net_price", "completion_rate"), [institutions]);

  const fieldsDebtVsEarnings4yr = useMemo(() => fieldsToScatter(fields, "median_debt", "median_earnings_4yr", accent.primary), [fields, accent.primary]);
  const fieldsEarnings1yrVs4yr = useMemo(() => fieldsToScatter(fields, "median_earnings_1yr", "median_earnings_4yr", accent.secondary), [fields, accent.secondary]);

  const goToField = (code: number) => navigate(`/fields/${code}`);

  if (error) {
    return (
      <div className="page-insights">
        <header className="page-header"><h1>Insights</h1></header>
        <div className="error-state">
          <p>Failed to load data for insights.</p>
          <button className="button small" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-insights">
        <header className="page-header"><h1>Insights</h1></header>
        <div className="skeleton-chart" />
        <div className="skeleton-chart" />
      </div>
    );
  }

  return (
    <div className="page-insights">
      <header className="page-header">
        <h1>Insights</h1>
        <p className="subtitle">
          Visual patterns across {institutions.length.toLocaleString()} institutions and {fields.length} fields of study
        </p>
      </header>

      {/* ── Institution Heatmaps ── */}
      <section className="chart-section">
        <h2>Median Debt vs. Median Earnings (10yr)</h2>
        <p className="chart-desc">
          Density of institutions across debt and earnings. Brighter cells contain more schools.
          The dashed line shows the overall linear trend.
        </p>
        {debtVsEarnings.length > 0 ? (
          <HeatMap
            data={debtVsEarnings}
            xLabel="Median Debt"
            yLabel="Median Earnings (10yr)"
            xFormat={(v) => "$" + Math.round(v / 1000) + "k"}
            yFormat={(v) => "$" + Math.round(v / 1000) + "k"}
          />
        ) : (
          <p className="empty-state">Insufficient data.</p>
        )}
      </section>

      <section className="chart-section">
        <h2>Average Net Price vs. Completion Rate</h2>
        <p className="chart-desc">
          Higher completion rates at lower net prices suggest better value, though
          many factors influence both metrics.
        </p>
        {priceVsCompletion.length > 0 ? (
          <HeatMap
            data={priceVsCompletion}
            xLabel="Avg Net Price"
            yLabel="Completion Rate"
            xFormat={(v) => "$" + Math.round(v / 1000) + "k"}
            yFormat={(v) => (v * 100).toFixed(0) + "%"}
          />
        ) : (
          <p className="empty-state">Insufficient data.</p>
        )}
      </section>

      {/* ── Field of Study Charts ── */}
      <section className="chart-section">
        <h2>Fields of Study: Debt vs. Earnings (4yr)</h2>
        <p className="chart-desc">
          Each point is a CIP field aggregate. Click to explore programs.
          The dashed line shows the OLS trend.
        </p>
        {fieldsDebtVsEarnings4yr.length > 0 ? (
          <ScatterPlot
            data={fieldsDebtVsEarnings4yr}
            xLabel="Median Debt"
            yLabel="Median Earnings (4yr)"
            xFormat={(v) => "$" + Math.round(v / 1000) + "k"}
            yFormat={(v) => "$" + Math.round(v / 1000) + "k"}
            onClickPoint={goToField}
          />
        ) : (
          <p className="empty-state">Insufficient data.</p>
        )}
      </section>

      <section className="chart-section">
        <h2>Fields of Study: 1-Year vs. 4-Year Earnings</h2>
        <p className="chart-desc">
          How do early-career earnings compare to mid-career for each field?
          Points above the dashed diagonal (y = x) show fields where earnings grow over time.
        </p>
        {fieldsEarnings1yrVs4yr.length > 0 ? (
          <ScatterPlot
            data={fieldsEarnings1yrVs4yr}
            xLabel="Median Earnings (1yr)"
            yLabel="Median Earnings (4yr)"
            xFormat={(v) => "$" + Math.round(v / 1000) + "k"}
            yFormat={(v) => "$" + Math.round(v / 1000) + "k"}
            onClickPoint={goToField}
            showDiagonal
          />
        ) : (
          <p className="empty-state">Insufficient data.</p>
        )}
      </section>

      <p className="caveat">
        Institution heatmaps show density with OLS regression trends.
        Field scatter plots use CIP-level aggregates (median of program medians).
        R² indicates how much variation in the y-axis is explained by the x-axis — not causation.
        Suppressed or missing values are excluded.
      </p>
    </div>
  );
}
