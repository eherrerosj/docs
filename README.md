# Docs

A public library of independent static sites by Enrique Herreros.

**Library:** https://eherrerosj.github.io/docs/  
**FacturaScripts report:** https://eherrerosj.github.io/docs/sites/facturascripts/

## Structure

```text
docs/                         # GitHub repository
├── docs/                     # Published by GitHub Pages
│   ├── .nojekyll              # Serve files directly, without Jekyll
│   ├── index.html            # Library home
│   ├── sites.json            # Cards shown in the library
│   ├── assets/               # Library styles, scripts, icon
│   └── sites/
│       ├── facturascripts/
│       │   └── index.html    # First report, self-contained
│       └── your-next-site/
│           ├── index.html
│           └── assets/      # Keep each site's assets together
├── templates/static-site/    # Minimal starting page
├── scripts/add_site.py      # Import a site and add its library card
├── src/sculpture.js         # Editable source for the ASCII sculpture
├── package.json             # Optional tooling for rebuilding the sculpture
└── README.md
```

Only the inner `docs/` folder is served as the website. Everything committed to this public repository is readable on GitHub.

## Add a site from your computer

Requires Python 3. No packages or build tools are needed for the library.

```sh
git clone https://github.com/eherrerosj/docs.git
cd docs

# Import a single HTML report. It becomes the site's index.html.
python3 scripts/add_site.py my-report /path/to/report.html \
  --title "My report" --description "A short description of the report."

# Or import a complete static site, including its assets.
python3 scripts/add_site.py my-website /path/to/exported-site \
  --title "My website" --description "What readers will find here." \
  --category "Guide" --language "English"

git add docs
git commit -m "Publish my new site"
git push
```

Your site will be at `https://eherrerosj.github.io/docs/sites/my-report/` (or your chosen folder name). The helper creates the folder and updates `docs/sites.json`. It refuses to overwrite an existing site.

A single-file import works for self-contained HTML. For a page with images, styles, or scripts in separate files, import the containing folder. That folder must contain `index.html` at its root. The helper copies its contents as provided, so use a folder containing only the files you intend to publish.

To start from the template, copy `templates/static-site/`, edit it, then import that folder.

## Add a site through GitHub

1. Open `docs/sites/` in this repository.
2. Use **Add file → Upload files** and drag a folder named, for example, `my-guide`, containing `index.html` and its assets. Commit to `main`.
3. Edit `docs/sites.json` and append a card:

```json
{
  "slug": "my-guide",
  "title": "My guide",
  "description": "What this guide explains.",
  "category": "Guide",
  "language": "English",
  "updated": "2026-10-21"
}
```

Keep the surrounding JSON array and separate entries with commas. The folder name and `slug` must match. Use lowercase letters, numbers, and hyphens. A site is directly accessible even before its card is added to the library.

## Update or remove a site

- **Update:** replace the files inside its existing `docs/sites/<slug>/` folder, update its card date, commit, and push. The URL stays the same.
- **Remove:** delete its folder and its `sites.json` entry. Existing links to it will stop working.
- Keep shared library assets in `docs/assets/`; keep each site's own assets inside that site's folder to avoid name collisions.

## Preview locally

```sh
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000/. Use the local server rather than opening `index.html` directly, so the browser can load the catalog.

## Publishing

GitHub Pages is configured to **Deploy from a branch → `main` → `/docs`**. Each push to `main` triggers publication. Check **Actions** for the `pages build and deployment` run, or **Settings → Pages** for the published address. A successful Git push can precede the live update by a few minutes.

There is no custom workflow, framework, or dependency installation. The `.nojekyll` file tells Pages to serve the published files directly.

### Library design

The home page is a terminal-style index that follows the system color scheme, including live theme changes. Its ASCII file folder uses Three.js 0.186.1, bundled locally with its MIT license in `docs/assets/vendor/`. There are no CDN requests. `assets/catalog.js` builds the artifact list from `sites.json` and shows search when there are six or more entries.

The folder holds documents from the catalog (up to six visible sheets, with the full file count in its caption). Hovering or focusing an artifact brings its document forward. The animation has a pause button, respects reduced-motion preferences, and stops when the page or folder is out of view. A static ASCII drawing and the first artifact link remain available without WebGL or JavaScript.

Uploading sites needs no build tools. Only if you edit the sculpture, change `src/sculpture.js`, then run `npm ci` and `npm run build:sculpture`. Commit the updated source and generated `docs/assets/sculpture.js` together. The dependency versions are pinned in `package-lock.json`.

### Paths and supported content

- Use relative asset paths, such as `./assets/style.css`, within each site. A path such as `/assets/style.css` points at the account website root, outside this project.
- For a generated application, copy its static build output and configure its base URL as `/docs/sites/<slug>/`. Client-side routing should use hash routes or include actual HTML files for direct links; Pages does not provide arbitrary server rewrites.
- GitHub Pages serves static files. Server-side PHP, Python, private credentials, and database services belong elsewhere. The FacturaScripts site here is a report about the software, not a running ERP installation.
- Folder names are public URLs. Keep them stable once shared.

## First site

The FacturaScripts report includes technical due diligence, architecture diagrams, an invoice lifecycle, and a practical accounting course for Spanish limited companies. The original standalone HTML is preserved as the published page.
