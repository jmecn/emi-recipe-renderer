Symlink an export tree as `export/` (must contain `generated/recipes/layouts-index.json`). Use a `data-recipe-id` that exists in that index (the sample page uses `alekiships:crafting/oar`).

From the repo root:

```bash
npm run build
python3 -m http.server 8765
```

Open `http://localhost:8765/demo/`.

The page passes `injectIconStylesheets: true` (same as `emi-demo`’s `demo-app.js`) so `generated/icons/icons.css` is loaded from the export root.
