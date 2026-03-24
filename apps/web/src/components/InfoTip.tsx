import { useState, useRef, useEffect } from "react";

interface Props {
  /** The metric key to look up in METRIC_DEFS */
  metric: string;
}

interface MetricDef {
  label: string;
  unit: string;
  definition: string;
  cohort: string;
}

export const METRIC_DEFS: Record<string, MetricDef> = {
  median_earnings: {
    label: "Median Earnings (10yr)",
    unit: "USD",
    definition:
      "Median annual earnings of former students 10 years after entry, among those employed and not enrolled.",
    cohort: "Pooled cohort of federal aid recipients who entered the institution.",
  },
  median_debt: {
    label: "Median Debt",
    unit: "USD",
    definition:
      "Median cumulative federal loan debt at graduation for completers.",
    cohort: "Completers who received federal student loans.",
  },
  avg_net_price: {
    label: "Average Net Price",
    unit: "USD",
    definition:
      "Average annual cost after grants and scholarships for first-time, full-time undergraduates receiving Title IV aid. Coalesces public and private net price.",
    cohort: "First-time, full-time, Title IV aid recipients.",
  },
  completion_rate: {
    label: "Completion Rate",
    unit: "%",
    definition:
      "Proportion of first-time, full-time students who completed within 150% of expected time. 4-year rate (C150_4) preferred; falls back to less-than-4-year rate (C150_L4) for 2-year and certificate institutions.",
    cohort: "First-time, full-time degree/certificate-seeking undergraduates.",
  },
  student_size: {
    label: "Undergraduate Enrollment",
    unit: "students",
    definition:
      "Total undergraduate enrollment as reported in the fall census (IPEDS).",
    cohort: "All enrolled undergraduates.",
  },
  earnings_1yr: {
    label: "Earnings (1yr)",
    unit: "USD",
    definition:
      "Median annual earnings one year after completion for graduates of a specific program.",
    cohort: "Program completers who received federal aid, employed and not enrolled.",
  },
  earnings_4yr: {
    label: "Earnings (4yr)",
    unit: "USD",
    definition:
      "Median annual earnings four years after completion for graduates of a specific program.",
    cohort: "Program completers who received federal aid, employed and not enrolled.",
  },
  program_debt: {
    label: "Program Debt",
    unit: "USD",
    definition:
      "Median cumulative federal loan debt for completers of a specific field of study and credential level.",
    cohort: "Program completers who received federal loans.",
  },
  completers: {
    label: "Completers",
    unit: "students",
    definition:
      "Number of students who completed the program in the reporting cohort. Counts below the suppression threshold are withheld for privacy.",
    cohort: "Two-year pooled cohort of program completers.",
  },
  net_price: {
    label: "Median Net Price",
    unit: "USD",
    definition:
      "Average annual cost after grants and scholarships. Same as Average Net Price.",
    cohort: "First-time, full-time, Title IV aid recipients.",
  },
};

export default function InfoTip({ metric }: Props) {
  const def = METRIC_DEFS[metric];
  if (!def) return null;

  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  // Flip tooltip left if it would overflow the viewport
  useEffect(() => {
    if (!open || !tipRef.current) return;
    const rect = tipRef.current.getBoundingClientRect();
    setFlipped(rect.right > window.innerWidth - 8);
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="infotip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="infotip-icon"
        aria-label={`More info about ${def.label}`}
        aria-expanded={open}
        tabIndex={0}
      >
        i
      </button>
      {open && (
        <span
          ref={tipRef}
          className={`infotip-popup ${flipped ? "infotip-flip" : ""}`}
          role="tooltip"
        >
          <strong>{def.label}</strong>
          <span className="infotip-unit">Unit: {def.unit}</span>
          <span className="infotip-def">{def.definition}</span>
          <span className="infotip-cohort">Cohort: {def.cohort}</span>
        </span>
      )}
    </span>
  );
}
