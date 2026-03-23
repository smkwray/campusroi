import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadCIPAggregates, formatCurrency, formatNumber } from "../data";
import { useAsyncData } from "../useAsyncData";
import type { CIPAggregate } from "../data";

const PAGE_SIZE = 50;

type SortKey = keyof CIPAggregate;

export default function Fields() {
  const { data: all, loading, error, retry } = useAsyncData(loadCIPAggregates);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_completers");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const aggregates = all ?? [];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = aggregates;
    if (q) result = result.filter((a) => a.cip_title?.toLowerCase().includes(q));

    return [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [aggregates, query, sortKey, sortDir]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  if (error) {
    return (
      <div className="page-fields">
        <header className="page-header">
          <h1>Fields of Study</h1>
        </header>
        <div className="error-state">
          <p>Failed to load fields of study data.</p>
          <button className="button small" onClick={retry}>Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-fields">
        <header className="page-header">
          <h1>Fields of Study</h1>
          <p className="subtitle">Loading...</p>
        </header>
        <div className="skeleton" style={{ height: 40, maxWidth: 440, marginBottom: 20 }} />
        <div className="skeleton-table" />
      </div>
    );
  }

  return (
    <div className="page-fields">
      <header className="page-header">
        <h1>Fields of Study</h1>
        <p className="subtitle">
          {formatNumber(filtered.length)} fields across{" "}
          {formatNumber(aggregates.reduce((s, a) => s + a.program_count, 0))} program-level records
        </p>
      </header>

      <div className="toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search fields of study..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th aria-sort={sortKey === "cip_title" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("cip_title")}>Field{sortIndicator("cip_title")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "institution_count" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("institution_count")}>Schools{sortIndicator("institution_count")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "total_completers" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("total_completers")}>Completers{sortIndicator("total_completers")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "median_earnings_1yr" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("median_earnings_1yr")}>Earnings (1yr){sortIndicator("median_earnings_1yr")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "median_earnings_4yr" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("median_earnings_4yr")}>Earnings (4yr){sortIndicator("median_earnings_4yr")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "median_debt" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("median_debt")}>Debt{sortIndicator("median_debt")}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((f) => (
              <tr key={f.cip_code}>
                <td>
                  <Link to={`/fields/${f.cip_code}`} className="inst-link">{f.cip_title}</Link>
                </td>
                <td className="num">{formatNumber(f.institution_count)}</td>
                <td className="num">{formatNumber(f.total_completers)}</td>
                <td className="num">{formatCurrency(f.median_earnings_1yr)}</td>
                <td className="num">{formatCurrency(f.median_earnings_4yr)}</td>
                <td className="num">{formatCurrency(f.median_debt)}</td>
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
        Aggregates are computed across all institutions and credential levels reporting
        to College Scorecard. Earnings and debt medians are the median of program-level
        medians, not individual-level.
      </p>
    </div>
  );
}
