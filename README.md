# emi-recipe-renderer

Render exported EMI recipe layouts (schema v2) in the browser. Unofficial—not affiliated with the [EMI](https://github.com/emilyploszaj/emi) mod.

## Install

```bash
npm install emi-recipe-renderer
```

Published files live under `dist/` (`emi.js`, `emi.min.js`, `emi.css`, `emi.min.css`).

### CDN (jsDelivr / unpkg)

Pin a version after the package is on npm:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.1.0/dist/emi.min.css">
<script src="https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.1.0/dist/emi.min.js"></script>
```

```html
<!-- unpkg -->
<link rel="stylesheet" href="https://unpkg.com/emi-recipe-renderer@0.1.0/dist/emi.min.css">
<script src="https://unpkg.com/emi-recipe-renderer@0.1.0/dist/emi.min.js"></script>
```

Unminified: use `dist/emi.js` and `dist/emi.css` instead.

## Usage

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
npm run build    # dist/emi.js + dist/emi.min.js + CSS
npm run watch    # rebuild on src changes
npm test
```

## Publish to npm

Package name `emi-recipe-renderer` is currently **unclaimed** on npm. One-time setup on your machine:

```bash
cd emi-recipe-renderer
npm login          # browser or OTP if 2FA is enabled
npm whoami         # confirm logged-in user
npm run test
npm publish        # runs prepublishOnly → build, then uploads dist/ + LICENSE + README
```

Notes:

- `dist/` is built automatically via `prepublishOnly`; it does not need to be committed.
- Preview tarball contents: `npm pack --dry-run`
- After publish, bump `version` in `package.json` for every subsequent release (`0.1.1`, `0.2.0`, …); npm does not allow republishing the same version.
- With npm 2FA, use an OTP when prompted, or a [granular access token](https://docs.npmjs.com/creating-and-viewing-access-tokens) with **Publish** permission in CI.

Verify:

```bash
npm view emi-recipe-renderer version
curl -I "https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.1.0/dist/emi.min.js"
```

To validate a full export bundle against this library locally, use the separate [`emi-bundle-verifier`](../emi-bundle-verifier) project — it depends on this package from npm and copies `dist/` into its static site (or use `?cdn=jsdelivr` to test the CDN build).