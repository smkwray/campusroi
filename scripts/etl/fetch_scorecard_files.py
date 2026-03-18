#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any

import httpx
from bs4 import BeautifulSoup
from rich.console import Console
from rich.table import Table
import typer

console = Console()
app = typer.Typer(add_completion=False)

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config" / "source_urls.json"
RAW_DIR = ROOT / "data" / "raw" / "scorecard"
DOWNLOAD_DIR = RAW_DIR / "downloads"
EXTRACT_DIR = RAW_DIR / "extracted"


def load_config() -> dict[str, Any]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def scrape_catalog_for_resources(client: httpx.Client, catalog_url: str) -> dict[str, str]:
    response = client.get(catalog_url, timeout=60.0)
    response.raise_for_status()
    html = response.text
    resources: dict[str, str] = {}

    # Prefer explicit JSON metadata if present.
    for title, url in re.findall(r'"title":\s*"([^"]+)"[\s\S]*?"downloadURL":\s*"([^"]+)"', html):
        resources[title.strip()] = url.strip()

    # Fallback to anchor text.
    if not resources:
        soup = BeautifulSoup(html, "html.parser")
        for anchor in soup.find_all("a", href=True):
            label = " ".join(anchor.get_text(" ", strip=True).split())
            href = anchor["href"]
            if label and href.startswith("http") and (
                "Scorecard" in label or "Field of Study" in label or "Institution Level Data" in label
            ):
                resources[label] = href

    return resources


def resolve_resource_urls() -> dict[str, str]:
    config = load_config()
    default_resources = {
        resource["title"]: resource["url"]
        for resource in config["resources"].values()
    }
    catalog_url = config["catalog_url"]

    with httpx.Client(
        follow_redirects=True,
        headers={"User-Agent": "college-value-atlas/0.1 (+https://github.com/)"},
    ) as client:
        try:
            scraped = scrape_catalog_for_resources(client, catalog_url)
            merged = default_resources.copy()
            merged.update(scraped)
            return merged
        except Exception as exc:  # noqa: BLE001
            console.print(f"[yellow]Catalog scrape failed; falling back to configured URLs.[/yellow] {exc}")
            return default_resources


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "resource"


def download_file(client: httpx.Client, url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with client.stream("GET", url, timeout=120.0) as response:
        response.raise_for_status()
        with destination.open("wb") as fh:
            for chunk in response.iter_bytes():
                fh.write(chunk)


def extract_if_zip(path: Path, target_dir: Path) -> None:
    if path.suffix.lower() != ".zip":
        return
    target_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path) as archive:
        archive.extractall(target_dir)


@app.command()
def main(force: bool = typer.Option(False, help="Re-download even if files already exist.")) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)

    resources = resolve_resource_urls()
    manifest: dict[str, Any] = {"resources": []}

    with httpx.Client(
        follow_redirects=True,
        headers={"User-Agent": "college-value-atlas/0.1 (+https://github.com/)"},
    ) as client:
        for title, url in resources.items():
            suffix = Path(url).suffix or ".bin"
            filename = Path(url).name
            destination = DOWNLOAD_DIR / filename
            extract_target = EXTRACT_DIR / safe_slug(title)

            if force and destination.exists():
                destination.unlink()
            if force and extract_target.exists():
                shutil.rmtree(extract_target)

            if not destination.exists():
                console.print(f"[cyan]Downloading[/cyan] {title} -> {destination.name}")
                download_file(client, url, destination)
            else:
                console.print(f"[green]Using cached file[/green] {destination.name}")

            extract_if_zip(destination, extract_target)

            manifest["resources"].append(
                {
                    "title": title,
                    "url": url,
                    "filename": destination.name,
                    "bytes": destination.stat().st_size,
                    "extracted_to": str(extract_target.relative_to(ROOT)) if extract_target.exists() else None,
                }
            )

    manifest_path = RAW_DIR / "download_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    table = Table(title="Downloaded College Scorecard resources")
    table.add_column("Title")
    table.add_column("File")
    table.add_column("Bytes", justify="right")
    table.add_column("Extracted")
    for resource in manifest["resources"]:
        table.add_row(
            resource["title"],
            resource["filename"],
            f'{resource["bytes"]:,}',
            resource["extracted_to"] or "-",
        )
    console.print(table)
    console.print(f"[bold green]Wrote manifest:[/bold green] {manifest_path}")


if __name__ == "__main__":
    app()
