#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
from rich.console import Console
from rich.table import Table

console = Console()

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "scorecard"
EXTRACT_DIR = RAW_DIR / "extracted"
REPORT_PATH = ROOT / "data" / "intermediate" / "inspection_report.json"


def inspect_csv(path: Path) -> dict[str, Any]:
    sample = pd.read_csv(path, nrows=5, low_memory=False)
    return {
        "filename": path.name,
        "relative_path": str(path.relative_to(ROOT)),
        "columns": sample.columns.tolist(),
        "sample_row_count": len(sample),
    }


def main() -> None:
    reports: list[dict[str, Any]] = []
    for path in sorted(EXTRACT_DIR.rglob("*.csv")):
        try:
            reports.append(inspect_csv(path))
        except Exception as exc:  # noqa: BLE001
            reports.append(
                {
                    "filename": path.name,
                    "relative_path": str(path.relative_to(ROOT)),
                    "error": str(exc),
                }
            )

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(reports, indent=2), encoding="utf-8")

    table = Table(title="Inspection summary")
    table.add_column("CSV file")
    table.add_column("Columns")
    table.add_column("Status")
    for report in reports:
        status = "ok" if "error" not in report else f'error: {report["error"]}'
        table.add_row(report["filename"], str(len(report.get("columns", []))), status)
    console.print(table)
    console.print(f"[bold green]Wrote report:[/bold green] {REPORT_PATH}")


if __name__ == "__main__":
    main()
