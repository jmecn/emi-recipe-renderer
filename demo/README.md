# Demo

Self-contained static site: `index.html`, `demo-app.js`, `lib/` (built from `dist/` via `npm run build:demo`), and `emi/` (sample export bundle, committed for GitHub Pages).

## Local

```bash
npm run demo
```

Opens `http://127.0.0.1:8766/` (serve root is this `demo/` folder).

After changing library source, run `npm run build:demo` again (or use `npm run demo`).

## Refresh sample data

```bash
python3 scripts/migrate-guide-export-to-emi-bundle.py ~/Downloads/guide-export demo/emi
```

Then commit `demo/emi/` if you want the live site updated.

## GitHub Pages

Push to `main`/`master`; the [pages workflow](../.github/workflows/pages.yml) runs `build:demo` and deploys this directory.

Live site: **https://jmecn.github.io/emi-recipe-renderer/**

In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
