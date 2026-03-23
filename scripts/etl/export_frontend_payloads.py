#!/usr/bin/env python3
"""Export curated parquet data to frontend-ready JSON payloads.

Key design choice: the full fields_of_study dataset (229K+ records, ~70MB JSON)
is too large to load in a browser in one shot.  Instead we export:
  - cip_aggregates.json  — one row per CIP code with summary stats (~435 entries)
  - fields.jsonl — one line per CIP code, each line is a JSON array of programs
  - institution_fields.jsonl — one line per institution, each line is a JSON array of programs

JSONL format avoids creating thousands of small files (6,690 previously) which
cause severe sync degradation on cloud-mounted filesystems (Google Drive, OneDrive).
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
from rich.console import Console

console = Console()

ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = ROOT / "data" / "processed"
PUBLIC_DATA_DIR = ROOT / "apps" / "web" / "public" / "data"


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, allow_nan=False)
    path.write_text(text, encoding="utf-8")


def to_serializable(obj: object) -> object:
    """Convert numpy types to native Python for JSON serialization."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    return obj


def safe_records(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to records with NaN/Inf → None, numpy types → native Python."""
    records = df.to_dict(orient="records")
    for rec in records:
        for k, v in list(rec.items()):
            if isinstance(v, (np.floating, float)):
                if np.isnan(v) or np.isinf(v):
                    rec[k] = None
                else:
                    rec[k] = float(v)
            elif isinstance(v, np.integer):
                rec[k] = int(v)
            elif isinstance(v, np.bool_):
                rec[k] = bool(v)
            elif v is pd.NA or v is pd.NaT:
                rec[k] = None
    return records


def build_filter_meta(institutions: pd.DataFrame) -> dict:
    meta: dict = {}
    if "state" in institutions.columns:
        meta["states"] = sorted(institutions["state"].dropna().unique().tolist())
    if "ownership" in institutions.columns:
        ownership_labels = {1: "Public", 2: "Private nonprofit", 3: "Private for-profit"}
        vals = institutions["ownership"].dropna().unique().tolist()
        meta["ownership"] = [
            {"value": int(v), "label": ownership_labels.get(int(v), str(int(v)))}
            for v in sorted(vals) if pd.notna(v)
        ]
    if "predominant_degree" in institutions.columns:
        meta["predominant_degree"] = [
            {"value": int(v), "label": lbl}
            for v, lbl in sorted({
                0: "Not classified", 1: "Certificate", 2: "Associate",
                3: "Bachelor\u2019s", 4: "Graduate",
            }.items())
            if v in institutions["predominant_degree"].values
        ]
    return meta


def median_or_none(series: pd.Series) -> float | None:
    clean = series.dropna()
    if clean.empty:
        return None
    return float(clean.median())


def build_cip_aggregates(fields: pd.DataFrame) -> list[dict]:
    """Aggregate field-of-study records by CIP code."""
    rows = []
    for code, group in fields.groupby("cip_code"):
        rows.append({
            "cip_code": to_serializable(code),
            "cip_title": group["cip_title"].iloc[0] if "cip_title" in group.columns else None,
            "program_count": int(len(group)),
            "institution_count": int(group["institution_id"].nunique()) if "institution_id" in group.columns else 0,
            "total_completers": to_serializable(group["completers"].sum()) if "completers" in group.columns else None,
            "median_earnings_1yr": median_or_none(group["median_earnings_1yr"]) if "median_earnings_1yr" in group.columns else None,
            "median_earnings_4yr": median_or_none(group["median_earnings_4yr"]) if "median_earnings_4yr" in group.columns else None,
            "median_debt": median_or_none(group["median_debt"]) if "median_debt" in group.columns else None,
        })
    rows.sort(key=lambda r: -(r["total_completers"] or 0))
    return rows


def write_jsonl_grouped(path: Path, df: pd.DataFrame, group_col: str) -> int:
    """Write a JSONL file where each line is {"key": <group_value>, "records": [...]}.

    Returns the number of groups written.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(path, "w", encoding="utf-8") as f:
        for key, group in df.groupby(group_col):
            serializable_key = to_serializable(key)
            line = json.dumps(
                {"key": serializable_key, "records": safe_records(group)},
                ensure_ascii=False,
                allow_nan=False,
            )
            f.write(line + "\n")
            count += 1
    return count


def main() -> None:
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    inst_path = PROCESSED_DIR / "institution.parquet"
    fos_path = PROCESSED_DIR / "field_of_study.parquet"

    # ── Institutions ──
    if inst_path.exists():
        institutions = pd.read_parquet(inst_path)

        write_json(PUBLIC_DATA_DIR / "institutions.json", safe_records(institutions))
        console.print(f"[green]Exported[/green] institutions.json ({len(institutions):,} records, "
                       f"{(PUBLIC_DATA_DIR / 'institutions.json').stat().st_size / 1024:.0f} KB)")

        # Search index (lightweight)
        idx_cols = ["institution_id", "school_name", "city", "state"]
        avail = [c for c in idx_cols if c in institutions.columns]
        search_df = institutions[avail].dropna(subset=["institution_id"])
        write_json(PUBLIC_DATA_DIR / "search_index.json", safe_records(search_df))
        console.print(f"[green]Exported[/green] search_index.json ({len(search_df):,} entries)")

        # Filter metadata
        write_json(PUBLIC_DATA_DIR / "filters.json", build_filter_meta(institutions))
        console.print(f"[green]Exported[/green] filters.json")

        # Summary stats
        summary = {
            "total_institutions": int(len(institutions)),
            "median_earnings_median": median_or_none(institutions.get("median_earnings", pd.Series(dtype=float))),
            "median_debt_median": median_or_none(institutions.get("median_debt", pd.Series(dtype=float))),
            "avg_net_price_median": median_or_none(institutions.get("avg_net_price", pd.Series(dtype=float))),
        }
        write_json(PUBLIC_DATA_DIR / "summary.json", summary)
        console.print(f"[green]Exported[/green] summary.json")

    # ── Fields of Study (JSONL) ──
    if fos_path.exists():
        fields = pd.read_parquet(fos_path)

        # 1. CIP-level aggregates (small, loaded by the Fields listing page)
        cip_agg = build_cip_aggregates(fields)
        write_json(PUBLIC_DATA_DIR / "cip_aggregates.json", cip_agg)
        console.print(f"[green]Exported[/green] cip_aggregates.json ({len(cip_agg)} fields)")

        # 2. Per-CIP programs as JSONL (one line per CIP code)
        fields_jsonl = PUBLIC_DATA_DIR / "fields.jsonl"
        n_cip = write_jsonl_grouped(fields_jsonl, fields, "cip_code")
        console.print(f"[green]Exported[/green] fields.jsonl ({n_cip} CIP groups, "
                       f"{fields_jsonl.stat().st_size / 1024:.0f} KB)")

        # 3. Per-institution programs as JSONL (one line per institution)
        inst_fields_jsonl = PUBLIC_DATA_DIR / "institution_fields.jsonl"
        n_inst = write_jsonl_grouped(inst_fields_jsonl, fields, "institution_id")
        console.print(f"[green]Exported[/green] institution_fields.jsonl ({n_inst} institutions, "
                       f"{inst_fields_jsonl.stat().st_size / 1024:.0f} KB)")

        # Clean up old per-file directories
        for old_dir in ("fields", "institution_fields"):
            old_path = PUBLIC_DATA_DIR / old_dir
            if old_path.exists() and old_path.is_dir():
                shutil.rmtree(old_path)
                console.print(f"[yellow]Removed[/yellow] old {old_dir}/ directory")

        # Remove old monolithic files
        for old_file in ("fields_of_study.json", "cip_index.json"):
            old_path = PUBLIC_DATA_DIR / old_file
            if old_path.exists():
                old_path.unlink()
                console.print(f"[yellow]Removed[/yellow] {old_file}")

    # ── Referential integrity check ──
    if inst_path.exists() and fos_path.exists():
        inst_ids = set(institutions["institution_id"].dropna().astype(int))
        fos_ids = set(fields["institution_id"].dropna().astype(int))
        orphans = fos_ids - inst_ids
        if orphans:
            console.print(
                f"[yellow]Warning:[/yellow] {len(orphans)} field-of-study institution_ids "
                f"have no match in institutions.json (e.g. {sorted(orphans)[:5]}). "
                f"Links to these institutions will show 'not found' in the frontend."
            )

    # ── Validate emitted files ──
    errors = 0
    for jf in PUBLIC_DATA_DIR.glob("*.json"):
        try:
            json.loads(jf.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, ValueError) as exc:
            console.print(f"[red]Invalid JSON:[/red] {jf.name} — {exc}")
            errors += 1
    for jlf in PUBLIC_DATA_DIR.glob("*.jsonl"):
        for line_num, line in enumerate(jlf.read_text(encoding="utf-8").splitlines(), 1):
            try:
                json.loads(line)
            except (json.JSONDecodeError, ValueError) as exc:
                console.print(f"[red]Invalid JSONL:[/red] {jlf.name} line {line_num} — {exc}")
                errors += 1
    if errors:
        console.print(f"[bold red]{errors} invalid file(s)![/bold red]")
        raise SystemExit(1)
    console.print(f"[green]All emitted files validated.[/green]")

    write_json(
        PUBLIC_DATA_DIR / "manifest.json",
        {
            "generated_by": "export_frontend_payloads.py",
            "files": [
                "institutions.json",
                "search_index.json",
                "filters.json",
                "summary.json",
                "cip_aggregates.json",
                "fields.jsonl",
                "institution_fields.jsonl",
            ],
        },
    )
    console.print(f"[bold green]Done.[/bold green] Payloads in {PUBLIC_DATA_DIR}")


if __name__ == "__main__":
    main()
