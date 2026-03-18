import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  loadInstitutions,
  loadFieldsByInstitution,
  formatCurrency,
  formatPercent,
  formatNumber,
  OWNERSHIP_LABELS,
  DEGREE_LABELS,
} from "../data";
import type { Institution, FieldOfStudy } from "../types";

export default function InstitutionDetail() {
  const { id } = useParams<{ id: string }>();
  const [inst, setInst] = useState<Institution | null>(null);
  const [programs, setPrograms] = useState<FieldOfStudy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const numId = Number(id);
    const instP = loadInstitutions().then((insts) =>
      setInst(insts.find((i) => i.institution_id === numId) ?? null)
    );
    const fieldsP = loadFieldsByInstitution(numId)
      .then(setPrograms)
      .catch(() => setPrograms([]));

    Promise.all([instP, fieldsP]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
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
          <span className="stat-label">Undergrad Size</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCurrency(inst.avg_net_price)}</span>
          <span className="stat-label">Avg Net Price</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatPercent(inst.completion_rate)}</span>
          <span className="stat-label">Completion Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCurrency(inst.median_earnings)}</span>
          <span className="stat-label">Median Earnings (10yr)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{formatCurrency(inst.median_debt)}</span>
          <span className="stat-label">Median Debt</span>
        </div>
      </section>

      <section style={{ marginTop: "32px" }}>
        {programs.length > 0 ? (
          <>
          <h2>Programs ({programs.length})</h2>
          <div className="table-wrap" style={{ marginTop: "12px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field of Study</th>
                  <th>Credential</th>
                  <th className="num">Completers</th>
                  <th className="num">Earnings (1yr)</th>
                  <th className="num">Earnings (4yr)</th>
                  <th className="num">Debt</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p, i) => (
                  <tr key={i}>
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
