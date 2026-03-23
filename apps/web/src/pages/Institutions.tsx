import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadInstitutions,
  loadFilters,
  formatCurrency,
  formatPercent,
  formatNumber,
  getCompletionRate,
  OWNERSHIP_LABELS,
  DEGREE_LABELS,
} from "../data";
import { useAsyncData } from "../useAsyncData";
import type { Institution, FilterMeta } from "../types";

const PAGE_SIZE = 50;

type SortKey = keyof Institution;
type SortDir = "asc" | "desc";

export default function Institutions() {
  const { data: all, loading, error, retry } = useAsyncData(loadInstitutions);
  const { data: filters } = useAsyncData(loadFilters);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("school_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [compare, setCompare] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const institutions = all ?? [];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = institutions;

    if (q) {
      result = result.filter(
        (i) =>
          i.school_name?.toLowerCase().includes(q) ||
          i.city?.toLowerCase().includes(q) ||
          i.state?.toLowerCase().includes(q)
      );
    }
    if (stateFilter) result = result.filter((i) => i.state === stateFilter);
    if (ownershipFilter) result = result.filter((i) => i.ownership === Number(ownershipFilter));
    if (degreeFilter) result = result.filter((i) => i.predominant_degree === Number(degreeFilter));

    result = [...result].sort((a, b) => {
      // When sorting by completion_rate, coalesce with completion_rate_l4
      const av = sortKey === "completion_rate" ? (a.completion_rate ?? a.completion_rate_l4) : a[sortKey];
      const bv = sortKey === "completion_rate" ? (b.completion_rate ?? b.completion_rate_l4) : b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return result;
  }, [institutions, query, stateFilter, ownershipFilter, degreeFilter, sortKey, sortDir]);

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  }

  function toggleCompare(id: number) {
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  const compareList = institutions.filter((i) => compare.has(i.institution_id));

  if (error) {
    return (
      <div className="page-institutions">
        <header className="page-header">
          <h1>Institutions</h1>
        </header>
        <div className="error-state">
          <p>Failed to load institution data.</p>
          <button className="button small" onClick={retry}>Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-institutions">
        <header className="page-header">
          <h1>Institutions</h1>
          <p className="subtitle">Loading...</p>
        </header>
        <div className="skeleton" style={{ height: 40, maxWidth: 440, marginBottom: 20 }} />
        <div className="skeleton-table" />
      </div>
    );
  }

  return (
    <div className="page-institutions">
      <header className="page-header">
        <h1>Institutions</h1>
        <p className="subtitle">{formatNumber(filtered.length)} of {formatNumber(institutions.length)} institutions</p>
      </header>

      <div className="toolbar">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="search"
            className="search-input"
            placeholder="Search by name, city, or state..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          />
          <button className="filter-toggle" onClick={() => setDrawerOpen(true)}>
            Filters{(stateFilter || ownershipFilter || degreeFilter) ? " *" : ""}
          </button>
        </div>
        <div className="filter-row">
          {filters && (
            <>
              <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}>
                <option value="">All states</option>
                {filters.states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={ownershipFilter} onChange={(e) => { setOwnershipFilter(e.target.value); setPage(0); }}>
                <option value="">All ownership</option>
                {filters.ownership.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={degreeFilter} onChange={(e) => { setDegreeFilter(e.target.value); setPage(0); }}>
                <option value="">All degree types</option>
                {filters.predominant_degree.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div className={`filter-drawer-overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`filter-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="filter-drawer-header">
          <h3>Filters</h3>
          <button className="filter-drawer-close" onClick={() => setDrawerOpen(false)}>&times;</button>
        </div>
        {filters && (
          <>
            <label>
              State
              <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}>
                <option value="">All states</option>
                {filters.states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Ownership
              <select value={ownershipFilter} onChange={(e) => { setOwnershipFilter(e.target.value); setPage(0); }}>
                <option value="">All ownership</option>
                {filters.ownership.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              Degree Type
              <select value={degreeFilter} onChange={(e) => { setDegreeFilter(e.target.value); setPage(0); }}>
                <option value="">All degree types</option>
                {filters.predominant_degree.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
          </>
        )}
      </div>

      {compare.size > 0 && (
        <section className="compare-bar">
          <span className="compare-label">Comparing {compare.size}:</span>
          {compareList.map((i) => (
            <span key={i.institution_id} className="compare-chip">
              {i.school_name}
              <button className="chip-remove" onClick={() => toggleCompare(i.institution_id)} aria-label="Remove">&times;</button>
            </span>
          ))}
          <Link to={`/compare?ids=${[...compare].join(",")}`} className="button small">Compare</Link>
        </section>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="th-compare"></th>
              <th aria-sort={sortKey === "school_name" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("school_name")}>Name{sortIndicator("school_name")}</button>
              </th>
              <th aria-sort={sortKey === "state" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("state")}>State{sortIndicator("state")}</button>
              </th>
              <th aria-sort={sortKey === "ownership" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("ownership")}>Type{sortIndicator("ownership")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "student_size" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("student_size")}>Size{sortIndicator("student_size")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "avg_net_price" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("avg_net_price")}>Net Price{sortIndicator("avg_net_price")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "completion_rate" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("completion_rate")}>Completion{sortIndicator("completion_rate")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "median_earnings" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("median_earnings")}>Earnings (10yr){sortIndicator("median_earnings")}</button>
              </th>
              <th className="num" aria-sort={sortKey === "median_debt" ? sortDir === "asc" ? "ascending" : "descending" : undefined}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("median_debt")}>Debt{sortIndicator("median_debt")}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((inst) => (
              <tr key={inst.institution_id} className={compare.has(inst.institution_id) ? "row-selected" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={compare.has(inst.institution_id)}
                    onChange={() => toggleCompare(inst.institution_id)}
                    aria-label={`Compare ${inst.school_name}`}
                  />
                </td>
                <td>
                  <Link to={`/institutions/${inst.institution_id}`} className="inst-link cell-name" title={inst.school_name}>
                    {inst.school_name}
                  </Link>
                  <span className="cell-sub">{inst.city}, {inst.state}</span>
                </td>
                <td>{inst.state}</td>
                <td>{inst.ownership != null ? OWNERSHIP_LABELS[inst.ownership] ?? inst.ownership : "\u2014"}</td>
                <td className="num">{formatNumber(inst.student_size)}</td>
                <td className="num">{formatCurrency(inst.avg_net_price)}</td>
                <td className="num" title={getCompletionRate(inst).label}>{formatPercent(getCompletionRate(inst).value)}</td>
                <td className="num">{formatCurrency(inst.median_earnings)}</td>
                <td className="num">{formatCurrency(inst.median_debt)}</td>
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
        Earnings are median wages 10 years after entry. Completion rate is 150%-time
        for 4-year programs (or less-than-4-year programs where applicable).
        Net price is for first-time, full-time students receiving
        federal aid. All figures are aggregate and descriptive.
      </p>
    </div>
  );
}
