import { Link } from "react-router-dom";

export default function Methodology() {
  return (
    <div className="page-methodology">
      <header className="page-header">
        <h1>Methodology</h1>
        <p className="subtitle">How this data is sourced, processed, and presented</p>
      </header>

      <section className="prose">
        <h2>Data Source</h2>
        <p>
          All data comes from the U.S. Department of Education's{" "}
          <a href="https://collegescorecard.ed.gov/data/" target="_blank" rel="noopener noreferrer">
            College Scorecard
          </a>{" "}
          most-recent-cohorts files. These files are updated periodically and include
          institution-level and program-level (field-of-study) records.
        </p>

        <h2>What the Metrics Mean</h2>

        <h3>Median Earnings (10-year)</h3>
        <p>
          Median wages of former students 10 years after they first enrolled, among
          those who are working and not enrolled in school. This covers all students
          who received federal financial aid, regardless of whether they completed
          their program.
        </p>

        <h3>Average Net Price</h3>
        <p>
          The average annual total cost of attendance minus grants and scholarships
          for first-time, full-time undergraduate students who received federal
          financial aid. For institutions that are both public and private, this
          figure uses the public net price when available, falling back to private.
        </p>

        <h3>Completion Rate</h3>
        <p>
          The share of first-time, full-time students who complete their program
          within 150% of the expected time (e.g., 6 years for a 4-year degree).
          This metric is only available for 4-year institutions.
        </p>

        <h3>Median Debt</h3>
        <p>
          <strong>Institution-level:</strong> The median original amount of
          federal loan principal upon entering repayment, among borrowers at
          that institution. This includes only federal loans, not private
          borrowing.
        </p>
        <p>
          <strong>Program-level:</strong> The median cumulative Stafford and
          Grad PLUS loan debt among completers of a specific program. The
          cohort and loan types may differ from the institution-level figure.
        </p>

        <h3>Program-Level Earnings (1yr / 4yr)</h3>
        <p>
          Median wages 1 or 4 years after completing a specific program, among
          completers who received federal financial aid. These are reported at
          the CIP-code and credential level.
        </p>

        <h2>Suppression and Missing Data</h2>
        <p>
          The Department of Education suppresses data when the cohort is too small
          (typically fewer than 30 students for earnings, fewer than 30 borrowers
          for debt) to protect individual privacy. Suppressed values appear as
          dashes (&mdash;) in this tool, never as zeros.
        </p>
        <p>
          Some institutions do not participate in federal financial aid programs
          and therefore have no Scorecard data at all. Others may have data for
          some metrics but not others, depending on their programs and reporting.
        </p>

        <h2>Important Limitations</h2>
        <ul>
          <li>
            <strong>Not personalized:</strong> All figures are population-level
            aggregates. Your individual cost, debt, and earnings will depend on
            your specific circumstances.
          </li>
          <li>
            <strong>Not causal:</strong> Higher earnings at a given institution do
            not necessarily mean attending that institution caused higher earnings.
            Student selection, local labor markets, and field of study all play roles.
          </li>
          <li>
            <strong>Federal aid recipients only:</strong> Most metrics cover only
            students who received federal financial aid, which is the majority but
            not all students.
          </li>
          <li>
            <strong>Historical cohorts:</strong> Earnings and completion data
            reflect students who enrolled years ago. Current students may face
            different conditions.
          </li>
        </ul>

        <h2>Processing Pipeline</h2>
        <p>
          Raw CSV files are downloaded from the College Scorecard, unzipped, and
          processed through a deterministic Python pipeline that selects, renames,
          and type-coerces columns. The output is served as static JSON. No manual
          data editing is performed.
        </p>
        <p>
          Source code for the pipeline is available in the project repository under{" "}
          <code>scripts/etl/</code>.
        </p>
      </section>

      <div className="hero-actions" style={{ marginTop: "2rem" }}>
        <Link to="/institutions" className="button">Explore Institutions</Link>
        <Link to="/fields" className="button ghost">Browse Fields of Study</Link>
      </div>
    </div>
  );
}
