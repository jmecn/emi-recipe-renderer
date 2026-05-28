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
- `recipes/shards/<namespace>.json` (required; one per namespace in root index)
- Layout JSON under `recipes/layouts/` (paths derived from merged `namespace:path` ids)
- `textures/manifest.json` (optional fallback to empty)
- `icons/index.json` (required for icon lookup)
- `icons/icons.css` (loaded when `injectIconStylesheets: true`)
- `tags/<namespace>/<items|blocks|fluids>/<path>.json` (optional per tag lookup)
- `lang/<locale>.json` (optional per locale; missing keys fall back to `en_us`)

Layout path behavior:
- `recipes/index.json` only carries `namespaces`.
- Each namespace resolves to one shard file: `recipes/shards/<namespace>.json`.
- Renderer combines `namespace:path` ids and maps each id to `recipes/layouts/<id-with-:-and-/-replaced-by-_>.json` (same rule as `minecraft-web-export`).

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

## Release checklist

1. Merge your changes from `dev` into `master`.
2. Bump `package.json` `version` on `master` (must be a new version on npm).
3. Run a quick local sanity check:
   - `npm ci`
   - `npm run build`
   - `npm test`
4. Create and push a matching tag (example: `v0.1.1` for version `0.1.1`).
5. Create a GitHub Release from that tag and click **Publish release**.
6. Wait for the `Publish npm package` workflow to finish.
7. Verify npm and CDN:
   - `npm view emi-recipe-renderer version`
   - `https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.1.1/dist/emi.min.js`
   - `https://unpkg.com/emi-recipe-renderer@0.1.1/dist/emi.min.js`