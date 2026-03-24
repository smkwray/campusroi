import { useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { loadFieldsByCIP, formatCurrency, formatNumber } from "../data";
import { useAsyncData } from "../useAsyncData";
import InfoTip from "../components/InfoTip";
import type { FieldOfStudy } from "../types";

const PAGE_SIZE = 50;
const CRED_ORDER = [1, 2, 3, 5, 6, 4];

export default function FieldDetail() {
  const { code } = useParams<{ code: string }>();
  const cipCode = Number(code);
  const loader = useCallback(() => loadFieldsByCIP(cipCode), [cipCode]);
  const { data: programs, loading, error, retry } = useAsyncData(loader, [cipCode]);
  const [page, setPage] = useState(0);

  const sorted = useMemo(
    () =>
      [...(programs ?? [])].sort((a, b) => {
        const ai = CRED_ORDER.indexOf(a.credential_level);
        const bi = CRED_ORDER.indexOf(b.credential_level);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }),
    [programs]
  );

  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  if (loading) return <div className="loading">Loading...</div>;

  if (error) {
    return (
      <div className="page-detail">
        <Link to="/fields" className="back-link">&larr; All Fields</Link>
        <div className="error-state">
          <p>Failed to load field data. The file may not exist for this CIP code.</p>
          <button className="button small" onClick={retry}>Retry</button>
        </div>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="page-detail">
        <Link to="/fields" className="back-link">&larr; All Fields</Link>
        <div className="empty-state">No programs found for this field of study.</div>
      </div>
    );
  }

  const title = programs[0].cip_title;

  return (
    <div className="page-detail">
      <Link to="/fields" className="back-link">&larr; All Fields</Link>

      <header className="detail-header">
        <h1>{title}</h1>
        <p className="subtitle">CIP {code} &middot; {formatNumber(programs.length)} programs across institutions</p>
      </header>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Institution</th>
              <th>Credential</th>
              <th className="num">Completers<InfoTip metric="completers" /></th>
              <th className="num">Earnings (1yr)<InfoTip metric="earnings_1yr" /></th>
              <th className="num">Earnings (4yr)<InfoTip metric="earnings_4yr" /></th>
              <th className="num">Debt<InfoTip metric="program_debt" /></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((p) => (
              <tr key={`${p.institution_id}-${p.cip_code}-${p.credential_level}`}>
                <td>
                  <Link to={`/institutions/${p.institution_id}`} className="inst-link">
                    {p.school_name}
                  </Link>
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

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      <p className="caveat">
        Earnings are median wages among completers who received federal financial
        aid. Debt is median cumulative Stafford/Grad PLUS loan debt among
        completers. Small cohorts are suppressed by the Department of Education.
      </p>
    </div>
  );
}
