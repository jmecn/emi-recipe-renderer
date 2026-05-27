# emi-recipe-renderer

Browser renderer for exported EMI recipe layouts.  
Unofficial project, not affiliated with [EMI](https://github.com/emilyploszaj/emi).

## Load the library

### Local `dist/` files

```html
<link rel="stylesheet" href="/path/to/emi.min.css">
<script src="/path/to/emi.min.js"></script>
```

Available files:
- `dist/emi.js` / `dist/emi.min.js`
- `dist/emi.css` / `dist/emi.min.css`

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.1.0/dist/emi.min.css">
<script src="https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.1.0/dist/emi.min.js"></script>
```

```html
<!-- unpkg -->
<link rel="stylesheet" href="https://unpkg.com/emi-recipe-renderer@0.1.0/dist/emi.min.css">
<script src="https://unpkg.com/emi-recipe-renderer@0.1.0/dist/emi.min.js"></script>
```

Pin a published version instead of using a floating tag.

## Minimal usage

```html
<link rel="stylesheet" href="/path/to/emi.min.css">
<script src="/path/to/emi.min.js"></script>

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
    baseUrl: '/emi-export',
    injectIconStylesheets: true,
  });
</script>
```

Notes:
- `baseUrl` is the root URL of your export bundle. It can be on a different host from `emi.min.js`.
- Mount targets only need `class="emi-recipe"` and `data-recipe-id`.
- `resourceVersion` is optional (`?v=...` cache-buster for JSON/CSS/images).
- Optional localization inputs: `locale`, `lang` (inline per-locale tables), `translations` (flat key overrides).

## Required export data under `baseUrl`

The renderer fetches these paths relative to `baseUrl`:

- `bundle.json` (required; must include `missingIconId`)
- `recipes/index.json` (required)
- Layout JSON files from each recipe entry's `layout` field in `recipes/index.json`
- `textures/manifest.json` (optional fallback to empty)
- `icons/index.json` (required for icon lookup)
- `icons/icons.css` (loaded when `injectIconStylesheets: true`)
- `tags/members.json` (optional)
- `lang/<locale>.json` (optional per locale; missing keys fall back to `en_us`)

Layout path behavior:
- The library reads `index.recipes[recipeId].layout` and fetches that exact path relative to `baseUrl`.
- Do not hardcode `recipes/layouts/*.json` in client code; use whatever path is stored in the index.

If `baseUrl` is cross-origin, the export host must allow CORS for these `fetch` requests.

## API surface

Global exports:
- `EmiRecipeRenderer`
- `EmiRecipeRenderer.mountAll`
- `initEmiSlotCarousels`
- `hideEmiTagPopover`

## Dev and publish (brief)

- Node `>=18`
- Build: `npm run build`
- Test: `npm test`
- Watch: `npm run watch`
- `npm publish` runs `prepublishOnly` (build) and publishes `dist/` + `LICENSE` (per package `files`)
- GitHub Actions publish workflow runs on **Release published** and uses the release tag (for example `v0.1.1`); it skips if that version already exists on npm.