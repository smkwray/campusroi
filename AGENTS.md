# AGENTS.md

## Project overview

Ship a modern, professional, static-first public data product that helps people explore colleges and fields of study using official College Scorecard data.

## Read order before doing work

1. `README.md`
2. `PLANS.md`
3. `docs/00-product-brief.md`
4. `docs/01-data-sources.md`
5. `docs/02-architecture.md`
6. `docs/03-exec-plan.md`
7. `docs/04-visual-spec.md`
8. `docs/05-acceptance-criteria.md`

## Working rules

- Prefer the official downloadable College Scorecard files as the primary ingestion path.
- Keep the app static-first. Do not introduce a backend unless static export clearly fails product requirements.
- Treat all metrics as aggregate and descriptive. Do not imply causal or personalized ROI estimates.
- Keep methodology and caveats visible in the UI.
- Prefer precomputed artifacts in `data/processed/` and frontend-ready JSON in `apps/web/public/data/`.
- If you change product scope or architecture, update the relevant doc before or alongside code changes.
- Favor explicit field maps and data contracts over one-off notebook logic.

## Suggested commands

- `python scripts/etl/fetch_scorecard_files.py`
- `python scripts/etl/inspect_downloads.py`
- `python scripts/etl/build_curated.py`
- `python scripts/etl/export_frontend_payloads.py`
- `pnpm --dir apps/web dev`
- `pnpm --dir apps/web build`

## Done means

A task is not done until:

- the data command path is deterministic
- docs still match the implementation
- the web app builds
- caveats remain visible
- the code leaves a clear next step for the next Codex run
