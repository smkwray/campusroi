# PLANS.md

## Current repo status

- [x] Seeded repo structure exists
- [x] Codex guidance exists
- [x] Official source URLs are documented
- [x] Initial programmatic ETL stubs exist
- [x] Minimal frontend shell exists
- [x] External virtualenv at ~/venvs/campusroi

## Phase 1 — deterministic ingestion (DONE)

- [x] Verify the downloader fetches:
  - the most recent institution-level ZIP
  - the most recent field-of-study ZIP
  - the current data dictionary XLSX
- [x] Unzip downloads into stable folder names
- [x] Write a machine-readable manifest of filenames and sizes
- [x] Fall back to configured URLs when catalog scrape fails
- [x] Fixed broken data.ed.gov URLs (403) with scorecard.network / collegescorecard.ed.gov

## Phase 2 — schema inspection and column mapping (DONE)

- [x] Inspect raw files and record discovered CSV names
- [x] Confirm field names for core metrics
- [x] Replace placeholder column candidates with verified mappings
- [x] Record data caveats that must surface in the UI

## Phase 3 — curated data layer (DONE)

- [x] Build `institution.parquet` (6,429 rows)
- [x] Build `field_of_study.parquet` (229,188 rows)
- [x] Build a search index
- [x] Build lightweight summary JSON for homepage and filter metadata
- [x] Export chunked per-CIP and per-institution JSON for on-demand loading

## Phase 4 — frontend shell (DONE)

- [x] Add routing (react-router-dom)
- [x] Add homepage (summary stats, info cards)
- [x] Add institution explorer (search, filter, sort, pagination, compare checkboxes)
- [x] Add institution detail (stats + per-institution programs)
- [x] Add field-of-study explorer (CIP aggregates with search/sort/pagination)
- [x] Add field-of-study detail (per-CIP programs with pagination)
- [x] Add compare view (side-by-side metric grid with highlighting)
- [x] Add methodology page (data source, metric definitions, caveats)

## Phase 5 — visual polish and shipping

- [x] Add scatter plot: debt vs earnings
- [x] Add scatter plot: price vs completion
- [ ] Add histogram/density view for a selected metric
- [x] Add responsive mobile filter drawer
- [x] Add empty states and loading skeletons
- [ ] Add attribution and caveat components
- [ ] Build static deploy configuration
- [ ] Add update workflow notes

## Phase 6 — optional enhancements

- [ ] Add map visualization (clustered institutions by location)
- [ ] Add optional API-based search augmentation
- [ ] Add saved comparisons (localStorage)
- [ ] Add downloadable filtered CSV exports
- [ ] Add editorial explainer pages for common questions
