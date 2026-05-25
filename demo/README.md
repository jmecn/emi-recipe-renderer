Symlink an export tree as `export/` (must contain `generated/recipes/layouts-index.json`), then from the repo root:

```bash
npm run build
python3 -m http.server 8765
```

Open `http://localhost:8765/demo/`.
