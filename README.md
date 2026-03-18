# College Value Atlas

> **[Live Site](https://smkwray.github.io/campusroi/)**

A static-first data explorer for U.S. colleges and fields of study — cost, completion, debt, and earnings — built on the Department of Education's College Scorecard.

## What it does

- **Explore 6,400+ institutions** with search, sort, filter, and side-by-side comparison
- **Browse 435 fields of study** with program-level earnings and debt breakdowns
- **Interactive insights** — density heatmaps with OLS regression, scatter plots for fields, 1yr vs 4yr earnings growth
- **"The Major Decision"** — an interactive quiz that picks your field and school based on location, interests, earnings patience, and debt tolerance

## Architecture

Deterministic Python ETL pipeline downloads College Scorecard CSVs, maps columns, handles privacy suppression, and exports chunked JSON payloads. React + Vite + TypeScript frontend loads data statically — no backend, no API keys, no database.

```
scorecard CSVs → pandas ETL → parquet → chunked JSON → static React app
```

## Quick start

```bash
# Python ETL (external venv)
python scripts/etl/fetch_scorecard_files.py
python scripts/etl/inspect_downloads.py
python scripts/etl/build_curated.py
python scripts/etl/export_frontend_payloads.py

# Frontend
pnpm install
pnpm --dir apps/web dev
```

## Repo layout

| Path | Purpose |
|------|---------|
| `scripts/etl/` | Download, inspect, curate, export pipeline |
| `apps/web/` | React + Vite + TypeScript frontend |
| `config/` | Source URLs and column mapping candidates |
| `docs/` | Product brief, data sources, architecture, visual spec |
| `data/` | Raw, intermediate, and processed artifacts (gitignored) |

## Product stance

This is a data exploration tool, not a college ranking. Metrics are aggregate and descriptive. Suppressed values show as dashes, never zeros. Caveats are visible throughout. See the [Methodology](https://smkwray.github.io/campusroi/methodology) page for details.

## Data source

All data from the [U.S. Department of Education College Scorecard](https://collegescorecard.ed.gov/data/) most-recent-cohorts files.
