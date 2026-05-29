# Bundle validation

## CLI

```bash
npm run validate -- /path/to/emi-bundle-root
# or
npx emi-bundle-validate /path/to/emi-bundle-root
```

Exit `0` on success; prints `FAIL: …` and exits `1` on error.

## Programmatic

```js
import { validateBundleRoot, printValidationOk } from 'emi-recipe-renderer/validate';

printValidationOk(validateBundleRoot('/path/to/emi-bundle-root'));
```

`validateBundleRoot` checks `bundle.json` and every route / layout-pack file listed in the manifest against the JSON Schemas in `schemas/`. It does not enforce export-time size budgets, route↔layout bijection, or presence of icons/items/lang assets. The browser build does not run this; use it in CI or before deploy.
