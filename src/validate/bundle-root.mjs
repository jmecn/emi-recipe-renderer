import fs from 'node:fs';
import path from 'node:path';

import { validateRecipeIndexSchemas } from './recipe-index.mjs';
import { fail } from './util.mjs';

/**
 * Validate EMI bundle JSON against published schemas (bundle, route shards, layout packs).
 * @param {string} bundleRoot
 * @returns {{ bundle: object, recipeIds: string[], root: string }}
 */
export function validateBundleRoot(bundleRoot) {
  const root = path.resolve(bundleRoot);
  if (!root || !fs.existsSync(root)) {
    fail(`bundle root does not exist: ${root || '<unset>'}`);
  }

  const { bundle, recipeIds } = validateRecipeIndexSchemas(root);

  return { bundle, recipeIds, root };
}

export function printValidationOk(result) {
  console.log(`OK: ${result.root}`);
  console.log(`  recipes: ${result.recipeIds.length}`);
  console.log(`  languages: ${result.bundle.languages.length}`);
  console.log(`  missingIconId: ${result.bundle.missingIconId}`);
}
