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

`validateBundleRoot` checks each JSON file against schema and runs bundle-wide rules (routes ↔ layouts, file sizes, required assets). The browser build does not run this; use it in CI or before deploy.
