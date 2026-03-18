#!/usr/bin/env python3
"""Build curated parquet files from raw College Scorecard CSVs."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console
from rich.table import Table
import typer

console = Console()
app = typer.Typer(add_completion=False)

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config" / "column_candidates.json"
EXTRACT_DIR = ROOT / "data" / "raw" / "scorecard" / "extracted"
OUT_DIR = ROOT / "data" / "processed"

# Prefer the dedicated "most recent" extracts over the all-data archive.
PREFERRED_DIRS = {
    "institution": "most-recent-institution-level-data",
    "field_of_study": "most-recent-data-by-field-of-study",
}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and slug-ify column names."""
    clean = [re.sub(r"[^a-z0-9]+", "_", str(c).strip().lower()).strip("_") for c in df.columns]
    df = df.copy()
    df.columns = clean
    return df


def choose_column(columns: list[str], candidates: list[str]) -> str | None:
    """Return the first candidate that exactly matches a column name."""
    col_set = set(columns)
    for candidate in candidates:
        if candidate.lower() in col_set:
            return candidate.lower()
    return None


def find_csv(kind: str) -> Path:
    """Locate the correct most-recent CSV for the given kind."""
    preferred = PREFERRED_DIRS.get(kind)
    if preferred:
        preferred_path = EXTRACT_DIR / preferred
        if preferred_path.exists():
            csvs = sorted(preferred_path.rglob("*.csv"))
            if csvs:
                return csvs[0]

    # Fallback: scan all extracted CSVs
    for path in sorted(EXTRACT_DIR.rglob("*.csv")):
        name = path.name.lower()
        if kind == "institution" and "institution" in name and "field" not in name:
            return path
        if kind == "field_of_study" and ("field" in name or "study" in name):
            return path

    raise FileNotFoundError(f"Could not find the {kind} CSV in {EXTRACT_DIR}")


def coerce_numeric(series: pd.Series) -> pd.Series:
    """Convert a series to numeric, treating 'PrivacySuppressed' and 'PS' as NaN."""
    return pd.to_numeric(series, errors="coerce")


def build_curated(
    kind: str,
    csv_path: Path,
    mapping: dict[str, list[str]],
) -> tuple[pd.DataFrame, dict[str, str | None]]:
    """Read raw CSV, select and rename columns, coerce types."""
    df = pd.read_csv(csv_path, low_memory=False)
    df = normalize_columns(df)

    chosen: dict[str, str | None] = {}
    for canonical, candidates in mapping.items():
        chosen[canonical] = choose_column(df.columns.tolist(), candidates)

    # Select matched columns
    keep = [col for col in chosen.values() if col]
    curated = df[keep].copy() if keep else df.head(0).copy()

    # Rename to canonical names
    rename_map = {actual: canonical for canonical, actual in chosen.items() if actual}
    curated = curated.rename(columns=rename_map)

    # For institutions: coalesce npt4_pub / npt4_priv into avg_net_price
    if kind == "institution" and "avg_net_price" in curated.columns:
        if "npt4_priv" in df.columns:
            pub = coerce_numeric(curated["avg_net_price"])
            priv = coerce_numeric(df["npt4_priv"])
            curated["avg_net_price"] = pub.combine_first(priv)

    # Coerce numeric columns (everything except IDs and text fields)
    text_cols = {
        "school_name", "city", "state", "zip", "cip_title",
        "credential_description", "cip_code",
    }
    for col in curated.columns:
        if col not in text_cols and col != "institution_id":
            curated[col] = coerce_numeric(curated[col])

    return curated, chosen


@app.command()
def main(
    limit: int = typer.Option(0, help="Limit rows (0 = all rows)."),
) -> None:
    """Build curated parquet files from raw College Scorecard CSVs."""
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    artifacts: dict[str, Any] = {}

    for kind in ("institution", "field_of_study"):
        csv_path = find_csv(kind)
        console.print(f"[cyan]Processing[/cyan] {kind} from {csv_path.name}")

        curated, chosen = build_curated(kind, csv_path, config[kind])

        if limit > 0:
            curated = curated.head(limit)

        out_path = OUT_DIR / f"{kind}.parquet"
        curated.to_parquet(out_path, index=False)

        # Summary stats
        missing: list[str] = [k for k, v in chosen.items() if v is None]
        table = Table(title=f"{kind} column mapping")
        table.add_column("Canonical")
        table.add_column("Source column")
        table.add_column("Non-null")
        for canonical, source in chosen.items():
            non_null = str(curated[canonical].notna().sum()) if source and canonical in curated.columns else "-"
            table.add_row(canonical, source or "[red]MISSING[/red]", non_null)
        console.print(table)

        if missing:
            console.print(f"[yellow]Warning:[/yellow] unmapped columns for {kind}: {missing}")

        artifacts[kind] = {
            "source_csv": str(csv_path.relative_to(ROOT)),
            "row_count": len(curated),
            "columns": list(curated.columns),
            "selected_columns": chosen,
            "unmapped": missing,
            "artifact": str(out_path.relative_to(ROOT)),
        }
        console.print(f"[green]Wrote[/green] {out_path} ({len(curated):,} rows)")
        console.print()

    manifest_path = OUT_DIR / "curated_manifest.json"
    manifest_path.write_text(json.dumps(artifacts, indent=2), encoding="utf-8")
    console.print(f"[bold green]Wrote manifest:[/bold green] {manifest_path}")


if __name__ == "__main__":
    app()
