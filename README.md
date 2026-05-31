# emi-recipe-renderer

Browser library for exported EMI recipe layouts. Not affiliated with [EMI](https://github.com/emilyploszaj/emi). 

Bundles are produced in-game by the [minecraft-web-export](https://github.com/jmecn/minecraft-web-export) Forge mod.

## Install

```bash
npm install emi-recipe-renderer
```

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.5.0/dist/emi.min.css">
<script src="https://cdn.jsdelivr.net/npm/emi-recipe-renderer@0.5.0/dist/emi.min.js"></script>
```

## Usage

```html
<div class="emi-recipe" data-recipe-id="minecraft:iron_pickaxe"></div>
<script>
  EmiRecipeRenderer.mountAll({
    baseUrl: '/path/to/emi-bundle',
    locale: 'en_us',
  });
</script>
```

`baseUrl` is the EMI export root. Elements need `class="emi-recipe"` and `data-recipe-id`.

## Validate a bundle (Node)

```bash
npx emi-bundle-validate /path/to/emi-bundle-root
```

```js
import { validateBundleRoot } from 'emi-recipe-renderer/validate';
validateBundleRoot('/path/to/emi-bundle-root');
```

## Development

```bash
npm ci && npm run build && npm test
```
