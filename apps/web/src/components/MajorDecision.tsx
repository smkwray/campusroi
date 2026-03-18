import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadInstitutions,
  loadCIPAggregates,
  loadFieldsByCIP,
  formatCurrency,
} from "../data";
import type { CIPAggregate } from "../data";
import type { Institution, FieldOfStudy } from "../types";

const INTERESTS = [
  { id: "tech", label: "Code Things", prefixes: [11] },
  { id: "eng", label: "Build Things", prefixes: [14, 15] },
  { id: "health", label: "Heal People", prefixes: [51] },
  { id: "biz", label: "Sell Things", prefixes: [52] },
  { id: "art", label: "Make Things Pretty", prefixes: [50, 4] },
  { id: "sci", label: "Discover Things", prefixes: [26, 27, 40] },
  { id: "edu", label: "Teach Things", prefixes: [13] },
  { id: "law", label: "Fight Crime", prefixes: [22, 43, 44] },
  { id: "comm", label: "Tell Stories", prefixes: [9, 23] },
  { id: "nature", label: "Go Outside", prefixes: [1, 3] },
];

type EarningsPref = "fast" | "long" | "balanced";
type DebtPref = "allergic" | "moderate" | "yolo";

interface Result {
  program: FieldOfStudy;
  score: number;
  institution: Institution | undefined;
}

function scoreProgram(
  p: FieldOfStudy,
  ep: EarningsPref,
  dp: DebtPref,
): number | null {
  const e1 = p.median_earnings_1yr;
  const e4 = p.median_earnings_4yr;
  const debt = p.median_debt;

  let earnings: number | null = null;
  if (ep === "fast") earnings = e1 ?? e4;
  else if (ep === "long") earnings = e4 ?? e1;
  else {
    if (e1 != null && e4 != null) earnings = (e1 + e4) / 2;
    else earnings = e1 ?? e4;
  }

  if (earnings == null || earnings === 0) return null;

  const debtVal = debt ?? 0;
  const penalty =
    dp === "allergic" ? debtVal * 1.5 :
    dp === "yolo" ? 0 :
    debtVal * 0.5;

  return earnings - penalty;
}

function pickQuip(result: Result): string {
  const e = result.program.median_earnings_4yr ?? result.program.median_earnings_1yr ?? 0;
  const d = result.program.median_debt ?? 0;
  if (e > 80000 && d < 20000) return "Low debt, high pay. You cracked the code.";
  if (e > 80000) return "The money's there. Just don't look at the bill.";
  if (d < 15000) return "Your wallet says thank you.";
  if (e > 60000) return "Solid. Not flashy, but you'll sleep well.";
  return "It's not about the money. (Okay, it's a little about the money.)";
}

export default function MajorDecision() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [cipAggs, setCipAggs] = useState<CIPAggregate[]>([]);

  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [earningsPref, setEarningsPref] = useState<EarningsPref>("balanced");
  const [debtPref, setDebtPref] = useState<DebtPref>("moderate");

  const [result, setResult] = useState<Result | null>(null);
  const [noResult, setNoResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    loadInstitutions().then(setInstitutions);
    loadCIPAggregates().then(setCipAggs);
  }, []);

  const states = useMemo(
    () => [...new Set(institutions.map((i) => i.state))].filter(Boolean).sort(),
    [institutions]
  );

  const cities = useMemo(() => {
    if (!state) return [];
    return [
      ...new Set(
        institutions
          .filter((i) => i.state === state)
          .map((i) => i.city)
      ),
    ]
      .filter(Boolean)
      .sort();
  }, [institutions, state]);

  const canSubmit = interests.size > 0;

  function toggleInterest(id: string) {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function findMyFuture() {
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    setNoResult(false);
    setRevealed(false);

    // 1. Valid institution IDs for state/city (empty state = all institutions)
    const filtered = state
      ? institutions.filter((i) => i.state === state && (!city || i.city === city))
      : institutions;
    const validIds = new Set(filtered.map((i) => i.institution_id));

    // 2. CIP codes matching interests
    const selectedPrefixes = INTERESTS
      .filter((i) => interests.has(i.id))
      .flatMap((i) => i.prefixes);

    // CIP codes are 4-digit ints (e.g. 5202 = family 52), so extract family as first 2 digits
    const matchingCips = cipAggs.filter((c) => {
      const family = Math.floor(c.cip_code / 100);
      return selectedPrefixes.includes(family);
    });

    // 3. Load programs
    const programs: FieldOfStudy[] = [];
    const batches: Promise<void>[] = [];
    for (const cip of matchingCips) {
      batches.push(
        loadFieldsByCIP(cip.cip_code)
          .then((fields) => {
            for (const f of fields) {
              if (validIds.has(f.institution_id)) programs.push(f);
            }
          })
          .catch(() => {})
      );
    }
    await Promise.all(batches);

    // 4. Score
    let best: Result | null = null;
    for (const p of programs) {
      const score = scoreProgram(p, earningsPref, debtPref);
      if (score != null && (best == null || score > best.score)) {
        best = {
          program: p,
          score,
          institution: institutions.find((i) => i.institution_id === p.institution_id),
        };
      }
    }

    if (best) {
      setResult(best);
      setTimeout(() => setRevealed(true), 50);
    } else {
      setNoResult(true);
    }
    setLoading(false);
  }

  return (
    <section className="picker-section">
      <div className="picker-header">
        <h2>The Major Decision</h2>
        <p className="picker-subtitle">
          Answer a few questions. We'll crunch {institutions.length.toLocaleString()} institutions
          and tell you exactly what to study and where. One answer. No hedging.
        </p>
      </div>

      <div className="picker-grid">
        {/* Q1: Location */}
        <div className="picker-q">
          <h3>Where are you looking?</h3>
          <div className="picker-selects">
            <select value={state} onChange={(e) => { setState(e.target.value); setCity(""); }}>
              <option value="">Anywhere in the U.S.</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {state && (
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Any city</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Q2: Interests */}
        <div className="picker-q">
          <h3>What sounds like you? <span className="picker-hint">(pick at least one)</span></h3>
          <div className="picker-toggles">
            <button
              className={`picker-toggle ${interests.size === INTERESTS.length ? "active" : ""}`}
              onClick={() => setInterests(interests.size === INTERESTS.length ? new Set() : new Set(INTERESTS.map(i => i.id)))}
            >
              All of the above
            </button>
            {INTERESTS.map((i) => (
              <button
                key={i.id}
                className={`picker-toggle ${interests.has(i.id) ? "active" : ""}`}
                onClick={() => toggleInterest(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q3: Earnings timeline */}
        <div className="picker-q">
          <h3>How patient are you?</h3>
          <div className="picker-options">
            <button
              className={`picker-option ${earningsPref === "fast" ? "active" : ""}`}
              onClick={() => setEarningsPref("fast")}
            >
              <strong>I needed money yesterday</strong>
              <span>Optimize for 1-year post-graduation earnings</span>
            </button>
            <button
              className={`picker-option ${earningsPref === "balanced" ? "active" : ""}`}
              onClick={() => setEarningsPref("balanced")}
            >
              <strong>Somewhere in between</strong>
              <span>Balance short-term and long-term earnings</span>
            </button>
            <button
              className={`picker-option ${earningsPref === "long" ? "active" : ""}`}
              onClick={() => setEarningsPref("long")}
            >
              <strong>I'll wait for the big payoff</strong>
              <span>Optimize for 4-year post-graduation earnings</span>
            </button>
          </div>
        </div>

        {/* Q4: Debt aversion */}
        <div className="picker-q">
          <h3>How do you feel about debt?</h3>
          <div className="picker-options">
            <button
              className={`picker-option ${debtPref === "allergic" ? "active" : ""}`}
              onClick={() => setDebtPref("allergic")}
            >
              <strong>It literally keeps me up at night</strong>
              <span>Heavily penalize programs with high debt</span>
            </button>
            <button
              className={`picker-option ${debtPref === "moderate" ? "active" : ""}`}
              onClick={() => setDebtPref("moderate")}
            >
              <strong>I'd prefer less but I get it</strong>
              <span>Factor debt in, but don't obsess</span>
            </button>
            <button
              className={`picker-option ${debtPref === "yolo" ? "active" : ""}`}
              onClick={() => setDebtPref("yolo")}
            >
              <strong>It's just leverage, baby</strong>
              <span>Maximize earnings regardless of borrowing</span>
            </button>
          </div>
        </div>
      </div>

      <button
        className="picker-submit"
        onClick={findMyFuture}
        disabled={!canSubmit || loading}
      >
        {loading ? "Crunching the numbers..." : "Tell Me What To Study"}
      </button>

      {/* Result */}
      {result && (
        <div className={`picker-result ${revealed ? "revealed" : ""}`}>
          <p className="picker-result-eyebrow">The data has spoken</p>
          <h3 className="picker-result-field">{result.program.cip_title}</h3>
          <p className="picker-result-at">
            {result.program.credential_description} at{" "}
            <Link to={`/institutions/${result.program.institution_id}`} className="inst-link">
              {result.program.school_name}
            </Link>
            {result.institution && (
              <span className="picker-result-loc">
                {" "}&middot; {result.institution.city}, {result.institution.state}
              </span>
            )}
          </p>
          <div className="picker-result-stats">
            {result.program.median_earnings_1yr != null && (
              <div className="picker-result-stat">
                <span className="stat-value">{formatCurrency(result.program.median_earnings_1yr)}</span>
                <span className="stat-label">Earnings (1yr)</span>
              </div>
            )}
            {result.program.median_earnings_4yr != null && (
              <div className="picker-result-stat">
                <span className="stat-value">{formatCurrency(result.program.median_earnings_4yr)}</span>
                <span className="stat-label">Earnings (4yr)</span>
              </div>
            )}
            {result.program.median_debt != null && (
              <div className="picker-result-stat">
                <span className="stat-value">{formatCurrency(result.program.median_debt)}</span>
                <span className="stat-label">Median Debt</span>
              </div>
            )}
          </div>
          <p className="picker-result-quip">{pickQuip(result)}</p>
          <p className="picker-result-caveat">
            Based on aggregate federal data for prior cohorts. Not a prediction of your
            individual outcome. See <Link to="/methodology">Methodology</Link> for caveats.
          </p>
        </div>
      )}

      {noResult && (
        <div className="picker-result revealed">
          <p className="picker-result-eyebrow">Well, this is awkward</p>
          <h3 className="picker-result-field">No programs found</h3>
          <p className="picker-result-at">
            Either your standards are impossibly high, that city is tiny,
            or you should consider broadening your interests. Try tweaking a filter.
          </p>
        </div>
      )}
    </section>
  );
}
