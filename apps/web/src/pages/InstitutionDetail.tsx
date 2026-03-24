import { useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  loadInstitutions,
  loadFieldsByInstitution,
  formatCurrency,
  formatPercent,
  formatNumber,
  getCompletionRate,
  OWNERSHIP_LABELS,
  DEGREE_LABELS,
} from "../data";
import { useAsyncData } from "../useAsyncData";
import InfoTip from "../components/InfoTip";
import type { Institution, FieldOfStudy } from "../types";

export default function InstitutionDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);

  const { data: institutions, loading: instLoading, error: instError, retry: retryInst } = useAsyncData(loadInstitutions);
  const loadPrograms = useCallback(() => loadFieldsByInstitution(numId), [numId]);
  const { data: programs, loading: progLoading, error: progError, retry: retryProg } = useAsyncData(loadPrograms, [numId]);

  const inst = useMemo(
    () => institutions?.find((i) => i.institution_id === numId) ?? null,
    [institutions, numId],
  );

  const loading = instLoading || progLoading;

  if (loading) return <div className="loading">Loading...</div>;

  if (instError) {
    return (
      <div className="page-detail">
        <div className="error-state">
          <p>Failed to load institution data.</p>
          <button className="button small" onClick={retryInst}>Retry</button>
        </div>
      </div>
    );
  }

  if (!inst) return <div className="empty-state">Institution not found.</div>;

  return (
    <div className="page-detail">
      <Link to="/institutions" className="back-link">&larr; All Institutions</Link>

      <header className="detail-header">
        <h1>{inst.school_name}</h1>
        <p className="subtitle">
          {inst.city}, {inst.state} {inst.zip}
          {inst.ownership != null && <> &middot; {OWNERSHIP_LABELS[inst.ownership]}</>}
          {inst.predominant_degree != null && <> &middot; {DEGREE_LABELS[inst.predominant_degree]}</>}
        </p>
      </header>

      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{formatNumber(inst.student_size)}</span>
          <span className="stat-label">Undergrad Size<InfoTip metric="student_size" /></span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCurrency(inst.avg_net_price)}</span>
          <span className="stat-label">Avg Net Price<InfoTip metric="avg_net_price" /></span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatPercent(getCompletionRate(inst).value)}</span>
          <span className="stat-label">{getCompletionRate(inst).label}<InfoTip metric="completion_rate" /></span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCurrency(inst.median_earnings)}</span>
          <span className="stat-label">Median Earnings (10yr)<InfoTip metric="median_earnings" /></span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCurrency(inst.median_debt)}</span>
          <span className="stat-label">Median Debt<InfoTip metric="median_debt" /></span>
        </div>
      </section>

      <section style={{ marginTop: "32px" }}>
        {progError ? (
          <div className="error-state">
            <p>Failed to load program data for this institution.</p>
            <button className="button small" onClick={retryProg}>Retry</button>
          </div>
        ) : programs && programs.length > 0 ? (
          <>
          <h2>Programs ({programs.length})</h2>
          <div className="table-wrap" style={{ marginTop: "12px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field of Study</th>
                  <th>Credential</th>
                  <th className="num">Completers<InfoTip metric="completers" /></th>
                  <th className="num">Earnings (1yr)<InfoTip metric="earnings_1yr" /></th>
                  <th className="num">Earnings (4yr)<InfoTip metric="earnings_4yr" /></th>
                  <th className="num">Debt<InfoTip metric="program_debt" /></th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={`${p.institution_id}-${p.cip_code}-${p.credential_level}`}>
                    <td>
                      <Link to={`/fields/${p.cip_code}`} className="inst-link">{p.cip_title}</Link>
                    </td>
                    <td>{p.credential_description}</td>
                    <td className="num">{formatNumber(p.completers)}</td>
                    <td className="num">{formatCurrency(p.median_earnings_1yr)}</td>
                    <td className="num">{formatCurrency(p.median_earnings_4yr)}</td>
                    <td className="num">{formatCurrency(p.median_debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <p className="empty-state">
            Program-level data is not available for this institution. This may be because
            cohort sizes are too small for public reporting, or because the institution
            does not participate in federal financial aid programs.
          </p>
        )}
      </section>

      <p className="caveat">
        Program-level data may be suppressed when cohort sizes are small.
        Earnings figures are median wages among employed graduates.
      </p>
    </div>
  );
}
