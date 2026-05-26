# emi-recipe-renderer

Render exported EMI recipe layouts (schema v2) in the browser. Unofficial—not affiliated with the [EMI](https://github.com/emilyploszaj/emi) mod.

## Usage

```bash
npm install emi-recipe-renderer
# dist/emi.js and dist/emi.css after install
```

```html
<link rel="stylesheet" href="/path/to/emi.css">
<script src="/path/to/emi.js"></script>

<div id="tooltip"></div>
<div id="tag-popover" class="tag-popover" hidden>
  <div class="tag-popover-panel">
    <div class="tag-popover-header"></div>
    <div class="tag-popover-stage-wrap"></div>
    <div class="tag-popover-footer"></div>
  </div>
</div>

<div class="emi-recipe" data-recipe-id="namespace:path"></div>

<script>
  EmiRecipeRenderer.mountAll({
    baseUrl: '/your-export-root',
    injectIconStylesheets: true,
    lazy: true,
    resourceVersion: window.APP_BUILD_ID,
  });
</script>
```

- **`baseUrl`** — root of the static export (layouts, icons, textures). Script and data URLs are independent (CDN + export host is fine).
- **`resourceVersion`** — optional build/deploy version string. Keep it stable between releases; change it only when the export bundle changes so JSON, textures, `icons.css`, and atlas images all refresh together.
- **HTML** — only `class="emi-recipe"` and `data-recipe-id`; layout paths stay in the export index.

## Export layout (`baseUrl` = `emi/` bundle root)

- `bundle.json` — languages list, default `en_us`
- `recipes/index.json` + `recipes/layouts/*.json`
- `textures/manifest.json`, `chrome/sh/`
- `icons/icons.css` + `icons/index.json` (single atlas)
- `tags/members.json` (optional)
- `lang/<locale>.json` — item/fluid/tag names; missing keys fall back to `en_us`

Options: `locale`, `resourceVersion`, `lang` (inline tables per locale), `translations` (flat key overrides).

Cross-origin export needs CORS on `fetch`.

## API

`EmiRecipeRenderer`, `EmiRecipeRenderer.mountAll`, `initEmiSlotCarousels`, `hideEmiTagPopover`.

## Development

Requires Node **18+** (see `.nvmrc`).

```bash
npm install
npm run build    # dist/emi.js + dist/emi.css
npm run watch    # rebuild on src changes
```

### Interactive demo

**Live:** [https://jmecn.github.io/emi-recipe-renderer/](https://jmecn.github.io/emi-recipe-renderer/) (GitHub Pages deploys the `demo/` folder).

Local:

```bash
npm run demo
```

Copies `dist/` into `demo/lib/` (no `../dist` in HTML) and serves `demo/` at `http://127.0.0.1:8766/`.