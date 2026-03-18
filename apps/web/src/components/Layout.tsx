import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function Layout() {
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    // Update the color-scheme meta tag so browser form controls match
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", theme);
  }, [theme]);

  // Respect OS preference changes if user hasn't explicitly chosen
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="layout">
      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="nav-brand">College Value Atlas</NavLink>
          <div className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/institutions">Institutions</NavLink>
            <NavLink to="/fields">Fields of Study</NavLink>
            <NavLink to="/insights">Insights</NavLink>
            <NavLink to="/methodology">Methodology</NavLink>
          </div>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "\u2600" : "\u263E"}
          </button>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>
          Data: U.S. Department of Education, College Scorecard (most recent cohorts).
          This tool presents aggregate, descriptive statistics and does not imply personalized or causal ROI claims.
        </p>
      </footer>
    </div>
  );
}
