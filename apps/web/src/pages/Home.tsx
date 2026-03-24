import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { loadSummary, formatCurrency, formatNumber } from "../data";
import { useAsyncData } from "../useAsyncData";
import InfoTip from "../components/InfoTip";

const MajorDecision = lazy(() => import("../components/MajorDecision"));

export default function Home() {
  const { data: summary, loading, error, retry } = useAsyncData(loadSummary);
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <div className="page-home">
      <section className="hero">
        <p className="eyebrow">Public Data Explorer</p>
        <h1>College Value Atlas</h1>
        <p className="lede">
          Explore cost, completion, debt, and earnings data for U.S. colleges
          and fields of study — drawn directly from the Department of Education's
          College Scorecard.
        </p>
        <div className="hero-actions">
          <Link to="/institutions" className="button">Explore Institutions</Link>
          <Link to="/fields" className="button ghost">Browse Fields of Study</Link>
        </div>
      </section>

      {error ? (
        <div className="error-state">
          <p>Failed to load summary data.</p>
          <button className="button small" onClick={retry}>Retry</button>
        </div>
      ) : summary ? (
        <section className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{formatNumber(summary.total_institutions)}</span>
            <span className="stat-label">Institutions</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatCurrency(summary.median_earnings_median)}</span>
            <span className="stat-label">Median Earnings (10yr)<InfoTip metric="median_earnings" /></span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatCurrency(summary.median_debt_median)}</span>
            <span className="stat-label">Median Debt<InfoTip metric="median_debt" /></span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatCurrency(summary.avg_net_price_median)}</span>
            <span className="stat-label">Median Net Price<InfoTip metric="net_price" /></span>
          </div>
        </section>
      ) : (
        <div className="skeleton-row">
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
          <div className="skeleton-stat" />
        </div>
      )}

      {showQuiz ? (
        <Suspense fallback={<div className="loading">Loading quiz...</div>}>
          <MajorDecision />
        </Suspense>
      ) : (
        <section className="quiz-gate">
          <h2>The Major Decision</h2>
          <p>Answer a few questions and we'll crunch the data to find your ideal program.</p>
          <button className="button" onClick={() => setShowQuiz(true)}>
            Open the Quiz
          </button>
        </section>
      )}

      <section className="info-grid">
        <article className="card">
          <h2>Deterministic Data</h2>
          <p>
            All data comes from the official College Scorecard files, downloaded and
            processed with a reproducible pipeline. No manual edits, no scraping.
          </p>
        </article>
        <article className="card">
          <h2>Honest Comparisons</h2>
          <p>
            Metrics are presented as aggregate, descriptive statistics for the
            populations covered. Where data is suppressed for privacy, it is
            shown as missing — never as zero.
          </p>
        </article>
        <article className="card">
          <h2>Visible Caveats</h2>
          <p>
            Cohort definitions, suppression thresholds, and coverage limitations
            are surfaced throughout. See the <Link to="/methodology">Methodology</Link> page
            for full details.
          </p>
        </article>
      </section>
    </div>
  );
}
