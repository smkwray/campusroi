#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx
from rich.console import Console
from rich.progress import track
import typer

console = Console()
app = typer.Typer(add_completion=False)

ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = ROOT / "data" / "raw" / "scorecard" / "api_latest_schools.json"
BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools"


def fetch_page(client: httpx.Client, api_key: str, page: int) -> dict[str, Any]:
    params = {
        "api_key": api_key,
        "page": page,
        "per_page": 100,
        "fields": "id,school,latest,location",
        "keys_nested": "true",
    }
    response = client.get(BASE_URL, params=params, timeout=90.0)
    response.raise_for_status()
    return response.json()


@app.command()
def main() -> None:
    api_key = os.getenv("COLLEGE_SCORECARD_API_KEY")
    if not api_key:
        raise typer.BadParameter(
            "COLLEGE_SCORECARD_API_KEY is not set. This helper is optional; use fetch_scorecard_files.py for the default no-key path."
        )

    results: list[dict[str, Any]] = []
    page = 0
    total = None

    with httpx.Client(follow_redirects=True, headers={"User-Agent": "college-value-atlas/0.1"}) as client:
        while True:
            payload = fetch_page(client, api_key, page)
            if total is None:
                total = payload.get("metadata", {}).get("total", 0)
                console.print(f"[cyan]API reports {total} total school records.[/cyan]")

            rows = payload.get("results", [])
            if not rows:
                break

            results.extend(rows)
            console.print(f"[green]Fetched page {page}[/green] ({len(rows)} rows)")
            page += 1

            if len(results) >= total:
                break

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps({"count": len(results), "results": results}, indent=2), encoding="utf-8")
    console.print(f"[bold green]Saved API snapshot:[/bold green] {OUT_PATH}")


if __name__ == "__main__":
    app()
