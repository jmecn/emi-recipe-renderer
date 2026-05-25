# emi-recipe-renderer

Render exported EMI recipe layouts (schema v2) in the browser. Unofficial—not affiliated with the [EMI](https://github.com/emilyploszaj/emi) mod.

## Usage

```html
<link rel="stylesheet" href="/path/to/emi.css">
<script src="/path/to/emi.js"></script>

<div id="tooltip"></div>
<div id="tag-popover" hidden></div>

<div class="emi-recipe" data-recipe-id="namespace:path"></div>

<script>
  EmiRecipeRenderer.mountAll({ baseUrl: '/your-export-root', lazy: true });
</script>
```

- **`baseUrl`** — root of the static export (layouts, icons, textures). Script and data URLs are independent (CDN + export host is fine).
- **HTML** — only `class="emi-recipe"` and `data-recipe-id`; layout paths stay in the export index.

## Export layout (under `baseUrl`)

- `generated/recipes/layouts-index.json` + `generated/recipes/layouts/*.json`
- `generated/recipe-textures/`, `generated/recipe-chrome/sh/`
- `generated/icons/icons.css` (or item / block-item / fluid CSS splits)
- `index/tag-members.json` (optional)

Cross-origin export needs CORS on `fetch`.

## API

`EmiRecipeRenderer`, `EmiRecipeRenderer.mountAll`, `initEmiSlotCarousels`, `hideEmiTagPopover`.
