import React, { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  loadInstitutions,
  formatCurrency,
  formatPercent,
  formatNumber,
  getCompletionRate,
  OWNERSHIP_LABELS,
  DEGREE_LABELS,
} from "../data";
import { useAsyncData } from "../useAsyncData";
import InfoTip from "../components/InfoTip";
import type { Institution } from "../types";

interface MetricRow {
  label: string;
  format: (v: number | null | undefined) => string;
  key: keyof Institution;
  caveat?: string;
  direction: "higher" | "lower" | "none";
}

const METRICS: MetricRow[] = [
  { label: "Undergrad Size", format: formatNumber, key: "student_size", direction: "none" },
  { label: "Avg Net Price", format: formatCurrency, key: "avg_net_price", caveat: "First-time, full-time, federal-aid recipients", direction: "lower" },
  { label: "Completion Rate", format: formatPercent, key: "completion_rate", caveat: "150%-time (4yr or <4yr depending on institution)", direction: "higher" },
  { label: "Median Earnings (10yr)", format: formatCurrency, key: "median_earnings", caveat: "10 years after entry", direction: "higher" },
  { label: "Median Debt", format: formatCurrency, key: "median_debt", direction: "lower" },
];

export default function Compare() {
  const [searchParams] = useSearchParams();
  const { data: all, loading, error, retry } = useAsyncData(loadInstitutions);

  const ids = useMemo(
    () => [...new Set((searchParams.get("ids") || "").split(",").map(Number).filter(Boolean))],
    [searchParams]
  );

  const institutions = all ?? [];

  const selected = useMemo(
    () => ids.map((id) => institutions.find((i) => i.institution_id === id)).filter(Boolean) as Institution[],
    [institutions, ids]
  );

  if (ids.length === 0) {
    return (
      <div className="page-detail">
        <h1>Compare Institutions</h1>
        <p className="empty-state">
          Select institutions to compare from the{" "}
          <Link to="/institutions">Institutions</Link> page using the checkboxes.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-detail">
        <h1>Compare Institutions</h1>
        <div className="error-state">
          <p>Failed to load institution data.</p>
          <button className="button small" onClick={retry}>Retry</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading...</div>;

  if (selected.length === 0) {
    return (
      <div className="page-detail">
        <Link to="/institutions" className="back-link">&larr; Back to Institutions</Link>
        <h1>Compare Institutions</h1>
        <p className="empty-state">
          None of the requested institution IDs were found.{" "}
          <Link to="/institutions">Browse institutions</Link> to select valid ones.
        </p>
      </div>
    );
  }

  return (
    <div className="page-compare">
      <Link to="/institutions" className="back-link">&larr; Back to Institutions</Link>
      <h1>Compare Institutions</h1>

      <div className="compare-grid" style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
        {/* Header row */}
        <div className="compare-cell compare-label"></div>
        {selected.map((inst) => (
          <div key={inst.institution_id} className="compare-cell compare-header">
            <Link to={`/institutions/${inst.institution_id}`} className="inst-link">
              {inst.school_name}
            </Link>
            <span className="cell-sub">
              {inst.city}, {inst.state}
            </span>
          </div>
        ))}

        {/* Type row */}
        <div className="compare-cell compare-label">Type</div>
        {selected.map((inst) => (
          <div key={inst.institution_id} className="compare-cell">
            {inst.ownership != null ? OWNERSHIP_LABELS[inst.ownership] : "\u2014"}
          </div>
        ))}

        {/* Degree row */}
        <div className="compare-cell compare-label">Predominant Degree</div>
        {selected.map((inst) => (
          <div key={inst.institution_id} className="compare-cell">
            {inst.predominant_degree != null ? DEGREE_LABELS[inst.predominant_degree] : "\u2014"}
          </div>
        ))}

        {/* Metric rows */}
        {METRICS.map((metric) => {
          const getValue = (inst: Institution) =>
            metric.key === "completion_rate"
              ? getCompletionRate(inst).value
              : inst[metric.key] as number | null;
          const values = selected.map(getValue);
          const validValues = values.filter((v): v is number => v != null);
          const best = validValues.length > 0 && metric.direction !== "none"
            ? (metric.direction === "higher"
              ? Math.max(...validValues)
              : Math.min(...validValues))
            : null;

          return (
            <React.Fragment key={metric.key}>
              <div className="compare-cell compare-label">
                {metric.label}<InfoTip metric={metric.key} />
                {metric.caveat && <span className="cell-caveat">{metric.caveat}</span>}
              </div>
              {selected.map((inst) => {
                const v = getValue(inst);
                const isBest = v != null && v === best && validValues.length > 1;
                return (
                  <div key={inst.institution_id} className={`compare-cell num ${isBest ? "highlight" : ""}`}>
                    {metric.format(v)}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      <p className="caveat">
        All metrics are aggregate and descriptive. Highlighted values indicate the
        best in the comparison set, not an absolute ranking.
      </p>
    </div>
  );
}
