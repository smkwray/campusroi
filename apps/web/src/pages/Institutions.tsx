import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadInstitutions,
  loadFilters,
  formatCurrency,
  formatPercent,
  formatNumber,
  OWNERSHIP_LABELS,
  DEGREE_LABELS,
} from "../data";
import type { Institution, FilterMeta } from "../types";

const PAGE_SIZE = 50;

type SortKey = keyof Institution;
type SortDir = "asc" | "desc";

export default function Institutions() {
  const [all, setAll] = useState<Institution[]>([]);
  const [filters, setFilters] = useState<FilterMeta | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("school_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [compare, setCompare] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadInstitutions().then(setAll);
    loadFilters().then(setFilters);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = all;

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
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return result;
  }, [all, query, stateFilter, ownershipFilter, degreeFilter, sortKey, sortDir]);

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

  const compareList = all.filter((i) => compare.has(i.institution_id));

  if (all.length === 0) {
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
        <p className="subtitle">{formatNumber(filtered.length)} of {formatNumber(all.length)} institutions</p>
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
              <th onClick={() => toggleSort("school_name")} className="sortable">Name{sortIndicator("school_name")}</th>
              <th onClick={() => toggleSort("state")} className="sortable">State{sortIndicator("state")}</th>
              <th onClick={() => toggleSort("ownership")} className="sortable">Type{sortIndicator("ownership")}</th>
              <th onClick={() => toggleSort("student_size")} className="sortable num">Size{sortIndicator("student_size")}</th>
              <th onClick={() => toggleSort("avg_net_price")} className="sortable num">Net Price{sortIndicator("avg_net_price")}</th>
              <th onClick={() => toggleSort("completion_rate")} className="sortable num">Completion{sortIndicator("completion_rate")}</th>
              <th onClick={() => toggleSort("median_earnings")} className="sortable num">Earnings (10yr){sortIndicator("median_earnings")}</th>
              <th onClick={() => toggleSort("median_debt")} className="sortable num">Debt{sortIndicator("median_debt")}</th>
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
                <td className="num">{formatPercent(inst.completion_rate)}</td>
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
        for 4-year programs. Net price is for first-time, full-time students receiving
        federal aid. All figures are aggregate and descriptive.
      </p>
    </div>
  );
}
