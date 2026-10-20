#!/usr/bin/env python3
"""Copy a static site into the published directory and register its library card."""

import argparse
from datetime import date
import json
from pathlib import Path
import re
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slug", help="URL folder, e.g. my-report")
    parser.add_argument("source", type=Path, help="Self-contained HTML file or folder containing index.html")
    parser.add_argument("--title", required=True)
    parser.add_argument("--description", default="")
    parser.add_argument("--category", default="Website")
    parser.add_argument("--language", default="English")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.slug):
        parser.error("Use lowercase letters, numbers, and single hyphens for the slug.")
    root = Path(__file__).resolve().parent.parent
    source = args.source.expanduser().resolve()
    target = root / "docs" / "sites" / args.slug
    catalog_path = root / "docs" / "sites.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    if target.exists() or any(site["slug"] == args.slug for site in catalog):
        parser.error("This slug already exists. Update its existing folder to preserve its URL.")
    if not args.title.strip():
        parser.error("The title cannot be empty.")
    if source.is_dir():
        if not (source / "index.html").is_file():
            parser.error("The source folder must contain index.html.")
        if source == target or source in target.parents:
            parser.error("The source folder cannot contain the destination.")
        if any(item.is_symlink() for item in source.rglob("*")):
            parser.error("Resolve or remove symbolic links before importing the site.")
    elif not source.is_file() or source.suffix.lower() not in (".html", ".htm"):
        parser.error("The source must be an HTML file or a folder containing index.html.")
    catalog.append({
        "slug": args.slug, "title": args.title.strip(),
        "description": args.description, "category": args.category,
        "language": args.language, "updated": date.today().isoformat(),
    })
    try:
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            target.mkdir(parents=True)
            shutil.copy2(source, target / "index.html")
        temporary = catalog_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temporary.replace(catalog_path)
    except Exception:
        if target.exists():
            shutil.rmtree(target)
        raise
    print(f"Added {args.slug}. Commit and push to publish:")
    print(f"https://eherrerosj.github.io/docs/sites/{args.slug}/")


if __name__ == "__main__":
    main()
